import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import {
  GameState,
  Player,
  GameLogEntry,
  TeamType,
  RoomId,
  RoomLocation,
  GameMode,
  PlayerStatus,
  GameSettings,
} from './src/types';
import { ROLES_DATA, FIXED_ROLES_PRESET, ROLE_IDS_POOL, ALL_ROOMS } from './src/rolesData';

const app = express();
const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'games.json');

app.use(express.json());

// Persist every successful game mutation without sprinkling file writes across all routes.
app.use('/api/games', (req, res, next) => {
  if (req.method !== 'GET') {
    res.on('finish', () => {
      if (res.statusCode < 500) persistGamesSoon();
    });
  }
  next();
});

// Shared game store. Kept in memory for speed and mirrored to disk so a single-server deployment
// can survive ordinary process restarts. For multi-instance scaling, replace this with Redis/DB.
type StoredGame = GameState & { pendingForensicEvents?: Array<{ round: number; victimNickname: string; room: RoomLocation }> };
const games: Record<string, StoredGame> = {};

function loadGamesFromDisk() {
  try {
    if (!fs.existsSync(DATA_FILE)) return;
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    if (!raw.trim()) return;
    const parsed = JSON.parse(raw) as Record<string, StoredGame>;
    Object.values(parsed).forEach((game) => {
      if (!game.chatMessages) game.chatMessages = [];
    });
    Object.assign(games, parsed);
    console.log(`[store] restored ${Object.keys(parsed).length} game(s) from ${DATA_FILE}`);
  } catch (error) {
    console.error('[store] failed to restore games:', error);
  }
}

let persistTimer: NodeJS.Timeout | null = null;
function persistGamesSoon() {
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      const tempFile = `${DATA_FILE}.tmp`;
      fs.writeFileSync(tempFile, JSON.stringify(games), 'utf8');
      fs.renameSync(tempFile, DATA_FILE);
    } catch (error) {
      console.error('[store] failed to persist games:', error);
    }
  }, 100);
}

loadGamesFromDisk();

function generateGameCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const DEFAULT_SETTINGS: GameSettings = {
  maxRounds: 10,
  preDiscussionTimeSeconds: 60, // 1분 사전 대화
  roomSelectionTimeSeconds: 15, // 15초 방 선택 제한
  allowRoleAbilities: true,
  killerWinConditionText: '총 3회 살인 성공 또는 10라운드 생존/최종 투표 승리',
  citizenWinConditionText: '경찰이 진짜 살인마를 체포하거나 최종 투표에서 살인마 검거',
  neutralWinConditionText: '소매치기(3회 절도+생존), 사이코패스(살인3회+생존), 도박꾼(베팅적중+생존)',
  autoAdvanceRound: false,
};

function addGameLog(
  game: GameState,
  message: string,
  type: 'info' | 'death' | 'arrest' | 'win' | 'phase' | 'police' | 'warden' | 'steal' = 'info'
) {
  const log: GameLogEntry = {
    id: generateId(),
    round: game.round,
    message,
    timestamp: Date.now(),
    type,
  };
  game.logs.unshift(log);
  if (game.logs.length > 100) game.logs.pop();
}

function generateTwoDistinctRooms(): [RoomId, RoomId] {
  const pool = [...ALL_ROOMS];
  const idx1 = Math.floor(Math.random() * pool.length);
  const room1 = pool[idx1];
  pool.splice(idx1, 1);
  const idx2 = Math.floor(Math.random() * pool.length);
  const room2 = pool[idx2];
  return [room1, room2];
}

function initializeRoundRoomOptions(game: GameState) {
  game.players.forEach((p) => {
    if (p.status === 'ALIVE') {
      p.randomRoomOptions = generateTwoDistinctRooms();
      p.roomOptionsGenerated = true;
      p.selectedRoom = null;
      p.confirmedRoom = false;
      p.roomConfirmed = false;
      p.currentRoom = null;
      p.drawnRoom = null;
      p.isRoomRevealed = false;
      p.usedRoomPassThisRound = false;
      p.usedPrisonPassThisRound = false;

      // If Bot, automatically select one of the two options and confirm
      if (p.isBot) {
        const chosen = p.randomRoomOptions[Math.floor(Math.random() * 2)];
        p.selectedRoom = chosen;
        p.currentRoom = chosen;
        p.confirmedRoom = true;
        p.roomConfirmed = true;
        p.isRoomRevealed = true;
      }
    }
  });
}

/**
 * Privacy Sanitizer:
 * 1. Regular players can ONLY see their OWN room candidates, selected room, and secret clues/role.
 * 2. Regular players MUST NOT see other players' actual room locations or candidates.
 * 3. Regular players CAN see whether other players have confirmed (for 9/12 progress count).
 * 4. Host and Game Over state can see full info.
 */
function sanitizeGameState(game: GameState, requesterId?: string): GameState {
  const isGameOver = game.status === 'GAME_OVER';
  const requester = game.players.find((p) => p.id === requesterId);
  const requesterIsWarden = requester?.roleId === 'warden';

  const sanitizedPlayers: Player[] = game.players.map((p) => {
    const isSelf = p.id === requesterId;

    if (isGameOver) {
      const roleDef = p.roleId ? ROLES_DATA[p.roleId] : undefined;
      return {
        ...p,
        role: roleDef,
        confirmedRoom: !!(p.confirmedRoom || p.roomConfirmed),
        roomConfirmed: !!(p.confirmedRoom || p.roomConfirmed),
      };
    }

    if (isSelf) {
      const roleDef = p.roleId ? ROLES_DATA[p.roleId] : undefined;
      return {
        ...p,
        role: roleDef,
        confirmedRoom: !!(p.confirmedRoom || p.roomConfirmed),
        roomConfirmed: !!(p.confirmedRoom || p.roomConfirmed),
      };
    }

    // Other player view: Hide room location, secret role, and private clues!
    const safePlayer: Player = {
      id: p.id,
      nickname: p.nickname,
      isHost: p.isHost,
      isBot: p.isBot,
      status: p.status,
      inventory: { roomPassCount: 0, prisonPassCount: 0 },
      confirmedRoom: !!(p.confirmedRoom || p.roomConfirmed),
      roomConfirmed: !!(p.confirmedRoom || p.roomConfirmed),
      roomOptionsGenerated: p.roomOptionsGenerated || false,
      randomRoomOptions: null, // DO NOT REVEAL
      selectedRoom: null, // DO NOT REVEAL
      currentRoom: null, // DO NOT REVEAL
      drawnRoom: null,
      abilityUsesRemaining: p.abilityUsesRemaining,
      joinedAt: p.joinedAt,
    };

    return safePlayer;
  });

  return {
    ...game,
    players: sanitizedPlayers,
    // Never leak secret role mapping or pending private clues before game over.
    roleMapping: isGameOver ? game.roleMapping : undefined,
    pendingForensicEvents: undefined,
    wardenTargetPlayerId: isGameOver || requesterIsWarden ? game.wardenTargetPlayerId : null,
    finalVotingVotes: isGameOver ? game.finalVotingVotes : undefined,
    chatMessages: game.chatMessages || [],
  };
}

// Calculate Neutral & Team Winners
function calculateEndGameWinners(game: GameState) {
  const teamWinner = game.winner;

  game.players.forEach((p) => {
    const roleId = p.roleId;
    const isAlive = p.status === 'ALIVE';

    if (!roleId) return;

    if (roleId === 'pickpocket') {
      const stealCount = p.stealCount || 0;
      if (stealCount >= 3 && isAlive) {
        p.isPersonalWinner = true;
        p.personalWinReason = `절도 3회 달성 (${stealCount}/3) 및 최종 생존 성공`;
      } else {
        p.isPersonalWinner = false;
        p.personalWinReason = isAlive ? `절도 횟수 부족 (${stealCount}/3)` : '게임 도중 사망/제외됨';
      }
    } else if (roleId === 'psychopath') {
      const killCount = game.killerKillCount || 0;
      if (killCount >= 3 && isAlive) {
        p.isPersonalWinner = true;
        p.personalWinReason = `살인마 3회 살인 달성 (${killCount}/3) 및 최종 생존 성공`;
      } else {
        p.isPersonalWinner = false;
        p.personalWinReason = isAlive ? `살인 횟수 미달 (${killCount}/3)` : '게임 도중 사망/제외됨';
      }
    } else if (roleId === 'gambler') {
      const bet = p.gamblerBet;
      if (bet && bet === teamWinner && isAlive) {
        p.isPersonalWinner = true;
        p.personalWinReason = `베팅 진영(${bet === 'citizen' ? '시민' : '살인마'}) 승리 적중 및 최종 생존 성공`;
      } else {
        p.isPersonalWinner = false;
        p.personalWinReason = !isAlive
          ? '게임 도중 사망/제외됨'
          : `베팅 실패 (베팅: ${bet === 'citizen' ? '시민' : '살인마'}, 실제 승리: ${teamWinner === 'citizen' ? '시민' : '살인마'})`;
      }
    } else {
      const roleDef = ROLES_DATA[roleId];
      if (roleDef) {
        p.isPersonalWinner = roleDef.team === teamWinner;
        p.personalWinReason = p.isPersonalWinner
          ? `${roleDef.teamName} 승리`
          : `${roleDef.teamName} 패배`;
      }
    }
  });
}

// Check auto win conditions
function evaluateWinCondition(game: GameState) {
  if (game.status !== 'PLAYING') return;

  const killerPlayer = game.players.find((p) => p.roleId === 'killer');

  // Condition 1: 3 Kills Achieved by Killer
  if (game.killerKillCount >= 3) {
    game.status = 'GAME_OVER';
    game.winner = 'killer';
    game.winnerReason = `살인마가 총 3회 살인에 성공하여 살인마 진영이 승리했습니다! (누적 살인: ${game.killerKillCount}회)`;
    addGameLog(game, `[게임 종료] 살인마 진영 승리! - ${game.winnerReason}`, 'win');
    calculateEndGameWinners(game);
    return;
  }

  // Condition 2: Killer is Arrested / Removed
  if (killerPlayer && (killerPlayer.status === 'REMOVED' || killerPlayer.status === 'DEAD')) {
    game.status = 'GAME_OVER';
    game.winner = 'citizen';
    game.winnerReason = `살인마(${killerPlayer.nickname})가 체포/제외되어 시민 진영이 승리했습니다!`;
    addGameLog(game, `[게임 종료] 시민 진영 승리! - ${game.winnerReason}`, 'win');
    calculateEndGameWinners(game);
    return;
  }

  // Condition 3: Max Rounds Finished without Killer caught
  if (game.round >= game.maxRound && game.phase === 'RESULT_DISCUSSION') {
    // Round 10 reached and resolved
    // Final vote can be initiated or Killer wins
    game.status = 'GAME_OVER';
    game.winner = 'killer';
    game.winnerReason = `최대 ${game.maxRound}라운드가 종료될 때까지 살인마가 체포되지 않고 생존하여 살인마 진영이 승리했습니다!`;
    addGameLog(game, `[게임 종료] 살인마 진영 승리! - ${game.winnerReason}`, 'win');
    calculateEndGameWinners(game);
    return;
  }

  // Condition 4: All Citizens Dead / Removed
  const aliveCitizens = game.players.filter(
    (p) => p.status === 'ALIVE' && p.roleId && ROLES_DATA[p.roleId]?.team === 'citizen'
  );
  if (aliveCitizens.length === 0 && game.players.length >= 12) {
    game.status = 'GAME_OVER';
    game.winner = 'killer';
    game.winnerReason = '모든 시민이 사망하거나 제외되어 살인마 진영이 승리했습니다!';
    addGameLog(game, `[게임 종료] 살인마 진영 승리! - ${game.winnerReason}`, 'win');
    calculateEndGameWinners(game);
  }
}

function deliverForensicCluesForNewRound(game: GameState) {
  const forensicPlayer = game.players.find((p) => p.roleId === 'forensic' && p.status === 'ALIVE');
  if (!forensicPlayer || !game.pendingForensicEvents?.length) return;

  const ready = game.pendingForensicEvents.filter((ev) => ev.round < game.round);
  const waiting = game.pendingForensicEvents.filter((ev) => ev.round >= game.round);
  if (!ready.length) return;

  if (!forensicPlayer.forensicClues) forensicPlayer.forensicClues = [];
  ready.forEach((ev) => {
    forensicPlayer.forensicClues?.unshift({
      round: ev.round,
      victimNickname: ev.victimNickname,
      clue: `[ROUND ${ev.round} 감식 결과] ${ev.victimNickname} 님의 사망 현장은 ${ev.room} 구역이며, 단둘이 고립된 상태에서 공격이 발생한 것으로 확인되었습니다.`,
    });
  });
  game.pendingForensicEvents = waiting;
}

/**
 * Execute Movement Resolution & Job Actions:
 * 1. Process Prison (Warden)
 * 2. Assign Rooms (Draw / Pass)
 * 3. Extrasensory Headcount
 * 4. 1:1 Killer Murder
 * 5. 1:1 Pickpocket Steal
 * 6. Generate Forensic & Witness Clues
 */
function executeResolveMovement(game: GameState) {
  // 1. Ensure all alive players have room assigned
  game.players.forEach((p) => {
    if (p.status === 'ALIVE') {
      if (p.currentRoom === 'PRISON') {
        // Already in prison
      } else if (!p.currentRoom) {
        if (p.selectedRoom) {
          p.currentRoom = p.selectedRoom;
        } else if (p.drawnRoom) {
          p.currentRoom = p.drawnRoom;
        } else {
          // Random fallback draw
          const randomRoom = ALL_ROOMS[Math.floor(Math.random() * ALL_ROOMS.length)];
          p.currentRoom = randomRoom;
          p.drawnRoom = randomRoom;
        }
        p.confirmedRoom = true;
      }
    }
  });

  // Group alive players by location
  const roomOccupancy: Record<string, Player[]> = {
    A: [],
    B: [],
    C: [],
    D: [],
    E: [],
    F: [],
    PRISON: [],
  };

  game.players.forEach((p) => {
    if (p.status === 'ALIVE' && p.currentRoom) {
      if (!roomOccupancy[p.currentRoom]) roomOccupancy[p.currentRoom] = [];
      roomOccupancy[p.currentRoom].push(p);
    }
  });

  // 2. Extrasensory (초감각자) Headcount Calculation
  const psychicPlayer = game.players.find((p) => p.roleId === 'psychic' && p.status === 'ALIVE');
  if (psychicPlayer && psychicPlayer.currentRoom) {
    const actualHeadcount = roomOccupancy[psychicPlayer.currentRoom]?.length || 0;
    psychicPlayer.extrasensoryRoomCount = actualHeadcount;
  }

  // 3. Killer (살인마) 1:1 Murder Check
  const killerPlayer = game.players.find((p) => p.roleId === 'killer' && p.status === 'ALIVE');
  let murderOccurred = false;
  let murderedVictim: Player | null = null;
  let murderRoom: RoomLocation | null = null;

  if (killerPlayer && killerPlayer.currentRoom) {
    const killerRoom = killerPlayer.currentRoom;
    const occupants = roomOccupancy[killerRoom] || [];

    // Condition: Exactly 2 people in the room (1:1 isolation)
    if (occupants.length === 2) {
      const victim = occupants.find((p) => p.id !== killerPlayer.id);

      if (victim) {
        const victimRole = victim.roleId;

        // In normal rooms (A~F): Follower, Corrupt Police, Police have protections!
        if (killerRoom !== 'PRISON') {
          if (victimRole === 'follower') {
            // Follower protected in normal room
          } else if (victimRole === 'corrupt_police') {
            // Corrupt police protected
          } else if (victimRole === 'police') {
            // Police protected in normal room & receives secret alert!
            victim.policeAttackedAlert = true;
          } else {
            // Murder succeeds!
            victim.status = 'DEAD';
            game.killerKillCount += 1;
            murderOccurred = true;
            murderedVictim = victim;
            murderRoom = killerRoom;

            addGameLog(
              game,
              `[사망 사건 발생] ${victim.nickname} 님이 살인마에게 살해되었습니다! (누적 살인: ${game.killerKillCount}/3)`,
              'death'
            );
          }
        } else {
          // In PRISON: NO PROTECTIONS! (Follower, Police, Corrupt Police can all be killed)
          victim.status = 'DEAD';
          game.killerKillCount += 1;
          murderOccurred = true;
          murderedVictim = victim;
          murderRoom = 'PRISON';

          addGameLog(
            game,
            `[감옥 사망 사건] 감옥에서 ${victim.nickname} 님이 살인마에게 살해되었습니다! (누적 살인: ${game.killerKillCount}/3)`,
            'death'
          );
        }
      }
    }
  }

  // 4. Pickpocket (소매치기) 1:1 Steal Check
  const pickpocketPlayer = game.players.find((p) => p.roleId === 'pickpocket' && p.status === 'ALIVE');
  if (pickpocketPlayer && pickpocketPlayer.currentRoom && pickpocketPlayer.currentRoom !== 'PRISON') {
    const pickpocketRoom = pickpocketPlayer.currentRoom;
    const occupants = roomOccupancy[pickpocketRoom] || [];

    // Condition: Exactly 2 people in normal room
    if (occupants.length === 2) {
      pickpocketPlayer.stealCount = (pickpocketPlayer.stealCount || 0) + 1;
      addGameLog(
        game,
        `[절도 성공] 소매치기가 1:1 밀실에서 절도에 성공했습니다. (누적: ${pickpocketPlayer.stealCount}/3)`,
        'steal'
      );
    }
  }

  // 5. Witness (목격자) & Forensic (법의학자) Clues
  if (murderOccurred && murderedVictim && murderRoom) {
    // Witness Clue (Immediate)
    const witnessPlayer = game.players.find((p) => p.roleId === 'witness' && p.status === 'ALIVE');
    if (witnessPlayer) {
      if (!witnessPlayer.witnessClues) witnessPlayer.witnessClues = [];
      const clueMessage = `사건 발생 당시 ${murderRoom} 구역 부근에서 은밀하게 이동하는 그림자와 살기를 감지했습니다.`;
      witnessPlayer.witnessClues.unshift({
        round: game.round,
        victimNickname: murderedVictim.nickname,
        clue: clueMessage,
      });
    }

    // Schedule Forensic Clue for next round
    if (!game.pendingForensicEvents) game.pendingForensicEvents = [];
    game.pendingForensicEvents.push({
      round: game.round,
      victimNickname: murderedVictim.nickname,
      room: murderRoom,
    });
  }

  game.phase = 'DAY';
  game.phaseExpiresAt = null;
  game.updatedAt = Date.now();

  const aliveCount = game.players.filter((p) => p.status === 'ALIVE').length;
  addGameLog(
    game,
    `ROUND ${String(game.round).padStart(2, '0')} ☀️ 낮이 되었습니다! 모든 플레이어의 이동이 완료되었습니다. (생존: ${aliveCount}명)`,
    'phase'
  );

  evaluateWinCondition(game);
}

// Check timer & auto transitions
function processGameTimeouts(game: GameState) {
  if (game.status !== 'PLAYING') return;

  const now = Date.now();

  // 1. If in PRE_SELECTION_DISCUSSION and time expired -> switch to ROOM_SELECTION
  if (game.phase === 'PRE_SELECTION_DISCUSSION' && game.phaseExpiresAt && now >= game.phaseExpiresAt) {
    game.phase = 'ROOM_SELECTION';
    game.phaseExpiresAt = now + game.settings.roomSelectionTimeSeconds * 1000;
    game.updatedAt = now;
    addGameLog(
      game,
      `[방 뽑기/선택 시작] 방 후보를 확인하고 이동할 방을 선택해주세요!`,
      'phase'
    );
  }

  // 2. If in ROOM_SELECTION and time expired -> auto resolve!
  else if (game.phase === 'ROOM_SELECTION' && game.phaseExpiresAt && now >= game.phaseExpiresAt) {
    executeResolveMovement(game);
  }
}

// Check if all alive players have drawn/selected room
function checkAllRoomsConfirmed(game: GameState) {
  if (game.status !== 'PLAYING') return;
  if (game.phase !== 'ROOM_SELECTION' && game.phase !== 'ROOM_DRAW') return;

  const alivePlayers = game.players.filter((p) => p.status === 'ALIVE');
  const allConfirmed =
    alivePlayers.length > 0 &&
    alivePlayers.every((p) => (p.confirmedRoom || p.roomConfirmed) && (p.selectedRoom || p.currentRoom === 'PRISON'));

  if (allConfirmed) {
    executeResolveMovement(game);
  }
}

// Periodical server tick
setInterval(() => {
  let changed = false;
  Object.values(games).forEach((game) => {
    const before = game.updatedAt;
    processGameTimeouts(game);
    if (game.updatedAt !== before) changed = true;
  });
  if (changed) persistGamesSoon();
}, 1000);

// ================= API ROUTES =================

// 1. Create a new game
app.post('/api/games/create', (req: Request, res: Response) => {
  const { nickname } = req.body;
  if (!nickname || typeof nickname !== 'string') {
    res.status(400).json({ error: '닉네임을 입력해주세요.' });
    return;
  }

  let code = generateGameCode();
  while (games[code]) {
    code = generateGameCode();
  }

  const hostPlayerId = generateId();
  const hostPlayer: Player = {
    id: hostPlayerId,
    nickname: nickname.trim(),
    isHost: true,
    status: 'ALIVE',
    inventory: { roomPassCount: 1, prisonPassCount: 1 }, // 1 ticket each
    selectedRoom: null,
    confirmedRoom: false,
    currentRoom: null,
    drawnRoom: null,
    abilityUsesRemaining: 0,
    joinedAt: Date.now(),
  };

  const newGame: GameState = {
    gameId: code,
    hostId: hostPlayerId,
    status: 'LOBBY',
    mode: 'FIXED',
    round: 1,
    maxRound: 10,
    phase: 'PRE_SELECTION_DISCUSSION',
    phaseExpiresAt: null,
    winner: null,
    winnerReason: null,
    rooms: ALL_ROOMS,
    players: [hostPlayer],
    logs: [],
    chatMessages: [],
    settings: { ...DEFAULT_SETTINGS },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    roleMapping: {},
    killerKillCount: 0,
  };

  addGameLog(newGame, `게임 방이 생성되었습니다 (코드: ${code}). HOST: ${hostPlayer.nickname}`);
  games[code] = newGame;

  res.json({
    gameId: code,
    playerId: hostPlayerId,
    game: sanitizeGameState(newGame, hostPlayerId),
  });
});

// 2. Join game
app.post('/api/games/join', (req: Request, res: Response) => {
  const { gameId, nickname, playerId } = req.body;
  const cleanCode = (gameId || '').trim().toUpperCase();

  const game = games[cleanCode];
  if (!game) {
    res.status(404).json({ error: '존재하지 않는 게임 코드입니다.' });
    return;
  }

  processGameTimeouts(game);

  if (playerId) {
    const existingPlayer = game.players.find((p) => p.id === playerId);
    if (existingPlayer) {
      res.json({
        gameId: cleanCode,
        playerId: existingPlayer.id,
        game: sanitizeGameState(game, existingPlayer.id),
      });
      return;
    }
  }

  if (game.status !== 'LOBBY') {
    res.status(400).json({ error: '이미 진행 중이거나 종료된 게임입니다.' });
    return;
  }

  if (game.players.length >= 12) {
    res.status(400).json({ error: '방 정원(12명)이 이미 가득 찼습니다.' });
    return;
  }

  if (!nickname || typeof nickname !== 'string') {
    res.status(400).json({ error: '닉네임을 입력해주세요.' });
    return;
  }

  const cleanNickname = nickname.trim();
  if (!cleanNickname) {
    res.status(400).json({ error: '닉네임을 입력해주세요.' });
    return;
  }
  if (game.players.some((p) => p.nickname.toLowerCase() === cleanNickname.toLowerCase())) {
    res.status(400).json({ error: '이미 사용 중인 닉네임입니다. 다른 닉네임을 사용해주세요.' });
    return;
  }

  const newPlayerId = generateId();
  const newPlayer: Player = {
    id: newPlayerId,
    nickname: cleanNickname,
    isHost: false,
    status: 'ALIVE',
    inventory: { roomPassCount: 1, prisonPassCount: 1 },
    selectedRoom: null,
    confirmedRoom: false,
    currentRoom: null,
    drawnRoom: null,
    abilityUsesRemaining: 0,
    joinedAt: Date.now(),
  };

  game.players.push(newPlayer);
  game.updatedAt = Date.now();
  addGameLog(game, `${newPlayer.nickname} 님이 입장했습니다. (${game.players.length}/12)`);

  res.json({
    gameId: cleanCode,
    playerId: newPlayerId,
    game: sanitizeGameState(game, newPlayerId),
  });
});

// 2b. Leave lobby and free the seat
app.post('/api/games/:gameId/leave', (req: Request, res: Response) => {
  const gameId = req.params.gameId.toUpperCase();
  const { playerId } = req.body;
  const game = games[gameId];

  if (!game) {
    res.status(404).json({ error: '게임을 찾을 수 없습니다.' });
    return;
  }
  if (game.status !== 'LOBBY') {
    res.status(400).json({ error: '게임 시작 후에는 참가 슬롯에서 나갈 수 없습니다. 브라우저를 닫아도 같은 기기에서 다시 접속할 수 있습니다.' });
    return;
  }

  const index = game.players.findIndex((p) => p.id === playerId);
  if (index < 0) {
    res.status(404).json({ error: '플레이어를 찾을 수 없습니다.' });
    return;
  }

  const leaving = game.players[index];
  game.players.splice(index, 1);

  if (game.players.length === 0) {
    delete games[gameId];
    res.json({ success: true, deleted: true });
    return;
  }

  if (leaving.id === game.hostId) {
    const nextHost = game.players.slice().sort((a, b) => a.joinedAt - b.joinedAt)[0];
    game.players.forEach((p) => (p.isHost = p.id === nextHost.id));
    game.hostId = nextHost.id;
    addGameLog(game, `${leaving.nickname} 방장이 나가 ${nextHost.nickname} 님에게 방장이 이전되었습니다.`);
  } else {
    addGameLog(game, `${leaving.nickname} 님이 로비에서 나갔습니다. (${game.players.length}/12)`);
  }
  game.updatedAt = Date.now();
  res.json({ success: true });
});

// 3. Get Game State
app.get('/api/games/:gameId', (req: Request, res: Response) => {
  const gameId = (req.params.gameId || '').toUpperCase();
  const playerId = req.query.playerId as string | undefined;

  const game = games[gameId];
  if (!game) {
    res.status(404).json({ error: '게임을 찾을 수 없습니다.' });
    return;
  }

  processGameTimeouts(game);

  res.json({
    game: sanitizeGameState(game, playerId),
  });
});

// 4. Change game mode or mapping
app.post('/api/games/:gameId/mode', (req: Request, res: Response) => {
  const gameId = req.params.gameId.toUpperCase();
  const { playerId, mode, roleMapping } = req.body;
  const game = games[gameId];

  if (!game) {
    res.status(404).json({ error: '게임을 찾을 수 없습니다.' });
    return;
  }
  if (game.hostId !== playerId) {
    res.status(403).json({ error: '방장만 설정을 변경할 수 있습니다.' });
    return;
  }

  if (mode && (mode === 'FIXED' || mode === 'RANDOM')) {
    game.mode = mode;
  }
  if (roleMapping) {
    game.roleMapping = roleMapping;
  }
  game.updatedAt = Date.now();

  res.json({ success: true, game: sanitizeGameState(game, playerId) });
});

// 5. Host auto-fill with bot players
app.post('/api/games/:gameId/host/fill-bots', (req: Request, res: Response) => {
  const gameId = req.params.gameId.toUpperCase();
  const { playerId } = req.body;
  const game = games[gameId];

  if (!game) {
    res.status(404).json({ error: '게임을 찾을 수 없습니다.' });
    return;
  }
  if (game.hostId !== playerId) {
    res.status(403).json({ error: '방장만 실행할 수 있습니다.' });
    return;
  }
  if (game.status !== 'LOBBY') {
    res.status(400).json({ error: '로비에서만 봇을 추가할 수 있습니다.' });
    return;
  }

  while (game.players.length < 12) {
    const slotIdx = game.players.length + 1;
    const botId = generateId();
    game.players.push({
      id: botId,
      nickname: `플레이어 ${slotIdx}`,
      isHost: false,
      isBot: true,
      status: 'ALIVE',
      inventory: { roomPassCount: 1, prisonPassCount: 1 },
      selectedRoom: null,
      confirmedRoom: false,
      currentRoom: null,
      drawnRoom: null,
      abilityUsesRemaining: 0,
      joinedAt: Date.now(),
    });
  }

  game.updatedAt = Date.now();
  addGameLog(game, `테스트용 참가자가 12명으로 채워졌습니다.`);

  res.json({ success: true, game: sanitizeGameState(game, playerId) });
});

// 6. Start Game
app.post('/api/games/:gameId/start', (req: Request, res: Response) => {
  const gameId = req.params.gameId.toUpperCase();
  const { playerId } = req.body;
  const game = games[gameId];

  if (!game) {
    res.status(404).json({ error: '게임을 찾을 수 없습니다.' });
    return;
  }
  if (game.hostId !== playerId) {
    res.status(403).json({ error: '방장만 게임을 시작할 수 있습니다.' });
    return;
  }
  if (game.players.length < 12) {
    res.status(400).json({
      error: `총 12명의 플레이어가 필요합니다. (현재: ${game.players.length}명)`,
    });
    return;
  }

  // Assign roles
  if (game.mode === 'FIXED') {
    game.players.forEach((player, index) => {
      const customRole = game.roleMapping?.[player.id];
      const presetRole = FIXED_ROLES_PRESET[index]?.roleId || ROLE_IDS_POOL[index % ROLE_IDS_POOL.length];
      player.roleId = customRole || presetRole;
      const roleDef = ROLES_DATA[player.roleId];
      player.abilityUsesRemaining = roleDef?.abilityMaxUses || 0;
      player.status = 'ALIVE';
      player.inventory = { roomPassCount: 1, prisonPassCount: 1 };
      player.selectedRoom = null;
      player.confirmedRoom = false;
      player.roomConfirmed = false;
      player.currentRoom = null;
      player.drawnRoom = null;
      player.stealCount = 0;
      player.forensicClues = [];
      player.witnessClues = [];
      player.policeAttackedAlert = false;
    });
  } else {
    const shuffledRoles = shuffleArray(ROLE_IDS_POOL);
    game.players.forEach((player, index) => {
      player.roleId = shuffledRoles[index];
      const roleDef = ROLES_DATA[player.roleId];
      player.abilityUsesRemaining = roleDef?.abilityMaxUses || 0;
      player.status = 'ALIVE';
      player.inventory = { roomPassCount: 1, prisonPassCount: 1 };
      player.selectedRoom = null;
      player.confirmedRoom = false;
      player.roomConfirmed = false;
      player.currentRoom = null;
      player.drawnRoom = null;
      player.stealCount = 0;
      player.forensicClues = [];
      player.witnessClues = [];
      player.policeAttackedAlert = false;
    });
  }

  game.status = 'PLAYING';
  game.round = 1;
  game.phase = 'PRE_SELECTION_DISCUSSION';
  game.phaseExpiresAt = Date.now() + game.settings.preDiscussionTimeSeconds * 1000;
  game.winner = null;
  game.winnerReason = null;
  game.killerKillCount = 0;
  game.wardenTargetPlayerId = null;

  // Initialize random 2 room candidates per alive player
  initializeRoundRoomOptions(game);

  game.updatedAt = Date.now();

  addGameLog(
    game,
    `[게임 시작] 12인의 비밀 역할이 배정되었습니다. ROUND 01 사전 대화/특수능력 단계가 시작되었습니다!`,
    'phase'
  );

  res.json({ success: true, game: sanitizeGameState(game, playerId) });
});

// 7. Draw Room (Reveals card options or generates them)
app.post('/api/games/:gameId/draw-room', (req: Request, res: Response) => {
  const gameId = req.params.gameId.toUpperCase();
  const { playerId, usePass, designatedRoom } = req.body;
  const game = games[gameId];

  if (!game) {
    res.status(404).json({ error: '게임을 찾을 수 없습니다.' });
    return;
  }
  if (game.status !== 'PLAYING') {
    res.status(400).json({ error: '게임이 진행 중이 아닙니다.' });
    return;
  }

  const player = game.players.find((p) => p.id === playerId);
  if (!player) {
    res.status(404).json({ error: '플레이어를 찾을 수 없습니다.' });
    return;
  }
  if (player.status !== 'ALIVE') {
    res.status(400).json({ error: '사망하거나 제외된 플레이어는 방을 뽑을 수 없습니다.' });
    return;
  }

  // If in PRISON
  if (player.currentRoom === 'PRISON') {
    player.confirmedRoom = true;
    player.roomConfirmed = true;
    checkAllRoomsConfirmed(game);
    res.json({ success: true, room: 'PRISON', game: sanitizeGameState(game, playerId) });
    return;
  }

  if (usePass && designatedRoom && ALL_ROOMS.includes(designatedRoom)) {
    if ((player.inventory?.roomPassCount || 0) <= 0) {
      res.status(400).json({ error: '보유한 방 지정권이 없습니다.' });
      return;
    }
    player.inventory.roomPassCount -= 1;
    player.usedRoomPassThisRound = true;
    player.selectedRoom = designatedRoom;
    player.drawnRoom = designatedRoom;
    player.currentRoom = designatedRoom;
    player.confirmedRoom = true;
    player.roomConfirmed = true;
    player.isRoomRevealed = true;
  } else {
    // Generate candidates if not existing
    if (!player.randomRoomOptions || player.randomRoomOptions.length < 2) {
      player.randomRoomOptions = generateTwoDistinctRooms();
      player.roomOptionsGenerated = true;
    }
    player.isRoomRevealed = true;
  }

  game.updatedAt = Date.now();
  checkAllRoomsConfirmed(game);

  res.json({
    success: true,
    options: player.randomRoomOptions,
    selectedRoom: player.selectedRoom,
    game: sanitizeGameState(game, playerId),
  });
});

// 7b. Select Room (Player selects 1 of the 2 options, then confirms)
app.post('/api/games/:gameId/select-room', (req: Request, res: Response) => {
  const gameId = req.params.gameId.toUpperCase();
  const { playerId, room, confirm, usePass } = req.body;
  const game = games[gameId];

  if (!game) {
    res.status(404).json({ error: '게임을 찾을 수 없습니다.' });
    return;
  }
  if (game.status !== 'PLAYING') {
    res.status(400).json({ error: '게임이 진행 중이 아닙니다.' });
    return;
  }

  const player = game.players.find((p) => p.id === playerId);
  if (!player) {
    res.status(404).json({ error: '플레이어를 찾을 수 없습니다.' });
    return;
  }
  if (player.status !== 'ALIVE') {
    res.status(400).json({ error: '사망하거나 제외된 플레이어는 방을 선택할 수 없습니다.' });
    return;
  }

  if (player.confirmedRoom || player.roomConfirmed) {
    res.status(400).json({ error: '이미 방 선택을 확정했습니다. 변경할 수 없습니다.' });
    return;
  }

  if (!player.randomRoomOptions || player.randomRoomOptions.length < 2) {
    player.randomRoomOptions = generateTwoDistinctRooms();
    player.roomOptionsGenerated = true;
  }

  if (usePass) {
    if ((player.inventory?.roomPassCount || 0) <= 0) {
      res.status(400).json({ error: '보유한 방 지정권이 없습니다.' });
      return;
    }
    if (!ALL_ROOMS.includes(room)) {
      res.status(400).json({ error: '유효한 방(A~F)을 지정해주세요.' });
      return;
    }
    player.selectedRoom = room;
    if (confirm) {
      player.inventory.roomPassCount -= 1;
      player.usedRoomPassThisRound = true;
      player.confirmedRoom = true;
      player.roomConfirmed = true;
      player.currentRoom = room;
      player.isRoomRevealed = true;
      checkAllRoomsConfirmed(game);
    }
  } else {
    // Regular selection from 2 candidates
    if (room && !player.randomRoomOptions.includes(room)) {
      res.status(400).json({ error: '제시된 두 개의 방 후보 중에서만 선택할 수 있습니다.' });
      return;
    }
    player.selectedRoom = room;
    player.isRoomRevealed = true;

    if (confirm) {
      if (!player.selectedRoom) {
        res.status(400).json({ error: '이동할 방을 먼저 선택해주세요.' });
        return;
      }
      player.confirmedRoom = true;
      player.roomConfirmed = true;
      player.currentRoom = player.selectedRoom;
      checkAllRoomsConfirmed(game);
    }
  }

  game.updatedAt = Date.now();
  res.json({
    success: true,
    selectedRoom: player.selectedRoom,
    confirmed: player.confirmedRoom || player.roomConfirmed,
    game: sanitizeGameState(game, playerId),
  });
});

// 8. Warden Action: Send player to Prison
app.post('/api/games/:gameId/warden-jail', (req: Request, res: Response) => {
  const gameId = req.params.gameId.toUpperCase();
  const { playerId, targetPlayerId } = req.body;
  const game = games[gameId];

  if (!game) {
    res.status(404).json({ error: '게임을 찾을 수 없습니다.' });
    return;
  }

  const requester = game.players.find((p) => p.id === playerId);
  if (!requester || requester.roleId !== 'warden') {
    res.status(403).json({ error: '교도관만 감옥 수감 능력을 사용할 수 있습니다.' });
    return;
  }
  if (requester.status !== 'ALIVE') {
    res.status(400).json({ error: '생존한 교도관만 능력을 사용할 수 있습니다.' });
    return;
  }
  if (game.phase !== 'PRE_SELECTION_DISCUSSION') {
    res.status(400).json({ error: '교도관 능력은 방 선택 전 사전 대화 단계에서만 사용할 수 있습니다.' });
    return;
  }
  if (game.wardenTargetPlayerId) {
    res.status(400).json({ error: '이번 라운드의 감옥 대상을 이미 지정했습니다.' });
    return;
  }
  if (targetPlayerId && requester.abilityUsesRemaining <= 0) {
    res.status(400).json({ error: '교도관 능력 사용 횟수를 모두 소진했습니다.' });
    return;
  }

  if (targetPlayerId) {
    const target = game.players.find((p) => p.id === targetPlayerId);
    if (!target || target.status !== 'ALIVE' || target.id === requester.id) {
      res.status(400).json({ error: '본인을 제외한 유효한 생존 플레이어를 선택해주세요.' });
      return;
    }

    target.currentRoom = 'PRISON';
    target.selectedRoom = null;
    target.drawnRoom = null;
    game.wardenTargetPlayerId = target.id;
    requester.abilityUsesRemaining = Math.max(0, requester.abilityUsesRemaining - 1);

    addGameLog(
      game,
      `[교도관 능력 발동] 교도관이 ${target.nickname} 님을 감옥(PRISON)으로 격리했습니다.`,
      'warden'
    );
  } else {
    game.wardenTargetPlayerId = null;
  }

  game.updatedAt = Date.now();
  res.json({ success: true, game: sanitizeGameState(game, playerId) });
});

// 9. Use Prison Pass (탈옥권)
app.post('/api/games/:gameId/use-prison-pass', (req: Request, res: Response) => {
  const gameId = req.params.gameId.toUpperCase();
  const { playerId } = req.body;
  const game = games[gameId];

  if (!game) {
    res.status(404).json({ error: '게임을 찾을 수 없습니다.' });
    return;
  }

  const player = game.players.find((p) => p.id === playerId);
  if (!player || player.currentRoom !== 'PRISON') {
    res.status(400).json({ error: '감옥 상태가 아닙니다.' });
    return;
  }

  if ((player.inventory?.prisonPassCount || 0) <= 0) {
    res.status(400).json({ error: '보유한 탈옥권이 없습니다.' });
    return;
  }

  player.inventory.prisonPassCount -= 1;
  player.usedPrisonPassThisRound = true;
  player.currentRoom = null; // Released back to draw A~F rooms
  player.confirmedRoom = false;

  addGameLog(game, `${player.nickname} 님이 탈옥권을 사용하여 감옥에서 벗어났습니다.`, 'warden');
  game.updatedAt = Date.now();

  res.json({ success: true, game: sanitizeGameState(game, playerId) });
});

// 10. Gambler Bet
app.post('/api/games/:gameId/gambler-bet', (req: Request, res: Response) => {
  const gameId = req.params.gameId.toUpperCase();
  const { playerId, betTeam } = req.body;
  const game = games[gameId];

  if (!game) {
    res.status(404).json({ error: '게임을 찾을 수 없습니다.' });
    return;
  }

  const player = game.players.find((p) => p.id === playerId);
  if (!player || player.roleId !== 'gambler') {
    res.status(403).json({ error: '도박꾼만 베팅할 수 있습니다.' });
    return;
  }

  if (betTeam !== 'citizen' && betTeam !== 'killer') {
    res.status(400).json({ error: '시민 또는 살인마 진영에만 베팅할 수 있습니다.' });
    return;
  }

  player.gamblerBet = betTeam;
  player.abilityUsesRemaining = 0;
  game.updatedAt = Date.now();

  res.json({ success: true, bet: betTeam, game: sanitizeGameState(game, playerId) });
});

// 11. Police Arrest
app.post('/api/games/:gameId/police-arrest', (req: Request, res: Response) => {
  const gameId = req.params.gameId.toUpperCase();
  const { playerId, targetPlayerId } = req.body;
  const game = games[gameId];

  if (!game) {
    res.status(404).json({ error: '게임을 찾을 수 없습니다.' });
    return;
  }
  if (game.status !== 'PLAYING') {
    res.status(400).json({ error: '게임이 진행 중이 아닙니다.' });
    return;
  }

  const requester = game.players.find((p) => p.id === playerId);
  if (!requester || requester.roleId !== 'police') {
    res.status(403).json({ error: '경찰만 체포 기능을 실행할 수 있습니다.' });
    return;
  }
  if (requester.status !== 'ALIVE') {
    res.status(400).json({ error: '사망하거나 제외된 경찰은 행동할 수 없습니다.' });
    return;
  }
  if (requester.abilityUsesRemaining <= 0) {
    res.status(400).json({ error: '경찰 체포권을 이미 사용했습니다.' });
    return;
  }

  const target = game.players.find((p) => p.id === targetPlayerId);
  if (!target || target.status !== 'ALIVE' || target.id === requester.id) {
    res.status(400).json({ error: '본인을 제외한 생존 플레이어만 체포할 수 있습니다.' });
    return;
  }
  requester.abilityUsesRemaining = 0;

  const isRealKiller = target.roleId === 'killer';

  if (isRealKiller) {
    target.status = 'REMOVED';
    addGameLog(
      game,
      `[체포 대성공] 경찰이 진짜 살인마 ${target.nickname}을(를) 완벽하게 검거했습니다!`,
      'arrest'
    );
    game.status = 'GAME_OVER';
    game.winner = 'citizen';
    game.winnerReason = `경찰이 진짜 살인마(${target.nickname})를 체포하여 시민 진영이 즉시 승리했습니다!`;
    addGameLog(game, `[게임 종료] 시민 진영 승리! - ${game.winnerReason}`, 'win');
    calculateEndGameWinners(game);
  } else {
    // Wrong arrest: Target and Police both REMOVED!
    target.status = 'REMOVED';
    requester.status = 'REMOVED';

    addGameLog(
      game,
      `[오검거 발생] 경찰이 ${target.nickname} 님을 체포하였으나 살인마가 아니었습니다. 체포 대상과 경찰 모두 게임에서 제외(REMOVED)됩니다.`,
      'arrest'
    );
  }

  game.updatedAt = Date.now();
  evaluateWinCondition(game);

  res.json({
    success: true,
    isRealKiller,
    targetNickname: target.nickname,
    game: sanitizeGameState(game, playerId),
  });
});

// 12. Corrupt Police Arrest (동귀어진 Mutual Destruction)
app.post('/api/games/:gameId/corrupt-police-arrest', (req: Request, res: Response) => {
  const gameId = req.params.gameId.toUpperCase();
  const { playerId, targetPlayerId } = req.body;
  const game = games[gameId];

  if (!game) {
    res.status(404).json({ error: '게임을 찾을 수 없습니다.' });
    return;
  }

  const requester = game.players.find((p) => p.id === playerId);
  if (!requester || requester.roleId !== 'corrupt_police') {
    res.status(403).json({ error: '부패경찰만 사용할 수 있습니다.' });
    return;
  }
  if (requester.status !== 'ALIVE') {
    res.status(400).json({ error: '생존 상태에서만 사용 가능합니다.' });
    return;
  }
  if (requester.abilityUsesRemaining <= 0) {
    res.status(400).json({ error: '동귀어진 체포권을 이미 사용했습니다.' });
    return;
  }

  const target = game.players.find((p) => p.id === targetPlayerId);
  if (!target || target.status !== 'ALIVE' || target.id === requester.id) {
    res.status(400).json({ error: '본인을 제외한 생존한 대상만 체포할 수 있습니다.' });
    return;
  }

  // Mutual destruction: Both REMOVED!
  target.status = 'REMOVED';
  requester.status = 'REMOVED';
  requester.abilityUsesRemaining = 0;

  addGameLog(
    game,
    `[부패경찰 동귀어진 체포] 부패경찰(${requester.nickname})이 ${target.nickname} 님을 체포하며 함께 게임에서 영구 제외(REMOVED)되었습니다!`,
    'arrest'
  );

  game.updatedAt = Date.now();
  evaluateWinCondition(game);

  res.json({ success: true, game: sanitizeGameState(game, playerId) });
});

// 13. Skip Discussion to Selection
app.post('/api/games/:gameId/skip-discussion', (req: Request, res: Response) => {
  const gameId = req.params.gameId.toUpperCase();
  const { playerId } = req.body;
  const game = games[gameId];

  if (!game) {
    res.status(404).json({ error: '게임을 찾을 수 없습니다.' });
    return;
  }
  if (game.hostId !== playerId) {
    res.status(403).json({ error: '방장만 대화를 건너뛸 수 있습니다.' });
    return;
  }
  if (game.phase !== 'PRE_SELECTION_DISCUSSION') {
    res.status(400).json({ error: '사전 대화 단계가 아닙니다.' });
    return;
  }

  game.phase = 'ROOM_SELECTION';
  game.phaseExpiresAt = Date.now() + game.settings.roomSelectionTimeSeconds * 1000;
  game.updatedAt = Date.now();
  addGameLog(game, `사전 대화가 종료되고 [방 뽑기/선택 단계(15초)]가 시작되었습니다.`, 'phase');

  res.json({ success: true, game: sanitizeGameState(game, playerId) });
});

// 14. Next Round
app.post('/api/games/:gameId/next-round', (req: Request, res: Response) => {
  const gameId = req.params.gameId.toUpperCase();
  const { playerId } = req.body;
  const game = games[gameId];

  if (!game) {
    res.status(404).json({ error: '게임을 찾을 수 없습니다.' });
    return;
  }
  if (game.hostId !== playerId) {
    res.status(403).json({ error: '방장만 다음 라운드로 진행할 수 있습니다.' });
    return;
  }
  if (game.status !== 'PLAYING') {
    res.status(400).json({ error: '게임이 진행 중이 아닙니다.' });
    return;
  }

  if (game.round >= game.maxRound) {
    evaluateWinCondition(game);
    res.json({ success: true, game: sanitizeGameState(game, playerId) });
    return;
  }

  game.round += 1;
  deliverForensicCluesForNewRound(game);
  game.phase = 'PRE_SELECTION_DISCUSSION';
  game.phaseExpiresAt = Date.now() + game.settings.preDiscussionTimeSeconds * 1000;
  game.wardenTargetPlayerId = null;

  // Reset and initialize 2 distinct room options for each alive player
  initializeRoundRoomOptions(game);

  game.updatedAt = Date.now();
  const aliveCount = game.players.filter((p) => p.status === 'ALIVE').length;
  addGameLog(
    game,
    `ROUND ${String(game.round).padStart(2, '0')} 시작! 사전 대화 및 특수능력 사용 단계입니다. (${aliveCount}명 생존)`,
    'phase'
  );

  res.json({ success: true, game: sanitizeGameState(game, playerId) });
});

// 14b. Set Phase (e.g. DAY -> DISCUSSION)
app.post('/api/games/:gameId/set-phase', (req: Request, res: Response) => {
  const gameId = req.params.gameId.toUpperCase();
  const { playerId, phase } = req.body;
  const game = games[gameId];

  if (!game) {
    res.status(404).json({ error: '게임을 찾을 수 없습니다.' });
    return;
  }
  if (game.hostId !== playerId) {
    res.status(403).json({ error: '방장만 단계를 변경할 수 있습니다.' });
    return;
  }

  game.phase = phase;
  game.phaseExpiresAt = null;
  game.updatedAt = Date.now();
  addGameLog(game, `게임 단계가 변경되었습니다. (${phase})`, 'phase');

  res.json({ success: true, game: sanitizeGameState(game, playerId) });
});

// 15. Force resolve
app.post('/api/games/:gameId/resolve-round', (req: Request, res: Response) => {
  const gameId = req.params.gameId.toUpperCase();
  const { playerId } = req.body;
  const game = games[gameId];

  if (!game) {
    res.status(404).json({ error: '게임을 찾을 수 없습니다.' });
    return;
  }
  if (game.hostId !== playerId) {
    res.status(403).json({ error: '방장만 강제 정산할 수 있습니다.' });
    return;
  }

  executeResolveMovement(game);

  res.json({ success: true, game: sanitizeGameState(game, playerId) });
});

// 16. Host Modify Player Status
app.post('/api/games/:gameId/host/update-player', (req: Request, res: Response) => {
  const gameId = req.params.gameId.toUpperCase();
  const { playerId, targetPlayerId, newStatus, newRoom } = req.body;
  const game = games[gameId];

  if (!game) {
    res.status(404).json({ error: '게임을 찾을 수 없습니다.' });
    return;
  }
  if (game.hostId !== playerId) {
    res.status(403).json({ error: '방장만 플레이어 상태를 수정할 수 있습니다.' });
    return;
  }

  const target = game.players.find((p) => p.id === targetPlayerId);
  if (!target) {
    res.status(404).json({ error: '대상 플레이어를 찾을 수 없습니다.' });
    return;
  }

  if (newStatus && ['ALIVE', 'DEAD', 'REMOVED'].includes(newStatus)) {
    target.status = newStatus as PlayerStatus;
  }
  if (newRoom && [...ALL_ROOMS, 'PRISON'].includes(newRoom)) {
    target.currentRoom = newRoom as RoomLocation;
  }

  game.updatedAt = Date.now();
  evaluateWinCondition(game);

  res.json({ success: true, game: sanitizeGameState(game, playerId) });
});

// 17. Host End Game
app.post('/api/games/:gameId/host/end-game', (req: Request, res: Response) => {
  const gameId = req.params.gameId.toUpperCase();
  const { playerId, winner, winnerReason } = req.body;
  const game = games[gameId];

  if (!game) {
    res.status(404).json({ error: '게임을 찾을 수 없습니다.' });
    return;
  }
  if (game.hostId !== playerId) {
    res.status(403).json({ error: '방장만 게임을 종료할 수 있습니다.' });
    return;
  }

  game.status = 'GAME_OVER';
  game.winner = winner as TeamType;
  game.winnerReason = winnerReason || '방장에 의해 게임이 종료되었습니다.';
  game.updatedAt = Date.now();

  calculateEndGameWinners(game);

  res.json({ success: true, game: sanitizeGameState(game, playerId) });
});

// 18. Host Pause / Resume
app.post('/api/games/:gameId/host/toggle-pause', (req: Request, res: Response) => {
  const gameId = req.params.gameId.toUpperCase();
  const { playerId } = req.body;
  const game = games[gameId];

  if (!game) {
    res.status(404).json({ error: '게임을 찾을 수 없습니다.' });
    return;
  }
  if (game.hostId !== playerId) {
    res.status(403).json({ error: '방장만 일시정지할 수 있습니다.' });
    return;
  }

  if (game.status === 'PLAYING') {
    game.status = 'PAUSED';
  } else if (game.status === 'PAUSED') {
    game.status = 'PLAYING';
    if (game.phase === 'PRE_SELECTION_DISCUSSION') {
      game.phaseExpiresAt = Date.now() + 60000;
    } else if (game.phase === 'ROOM_SELECTION') {
      game.phaseExpiresAt = Date.now() + 15000;
    }
  }

  game.updatedAt = Date.now();
  res.json({ success: true, game: sanitizeGameState(game, playerId) });
});

// 19. Restart Game
app.post('/api/games/:gameId/restart', (req: Request, res: Response) => {
  const gameId = req.params.gameId.toUpperCase();
  const { playerId } = req.body;
  const game = games[gameId];

  if (!game) {
    res.status(404).json({ error: '게임을 찾을 수 없습니다.' });
    return;
  }
  if (game.hostId !== playerId) {
    res.status(403).json({ error: '방장만 다시 시작할 수 있습니다.' });
    return;
  }

  game.status = 'LOBBY';
  game.round = 1;
  game.phase = 'PRE_SELECTION_DISCUSSION';
  game.phaseExpiresAt = null;
  game.winner = null;
  game.winnerReason = null;
  game.killerKillCount = 0;
  game.wardenTargetPlayerId = null;

  game.players.forEach((p) => {
    p.roleId = undefined;
    p.status = 'ALIVE';
    p.selectedRoom = null;
    p.confirmedRoom = false;
    p.currentRoom = null;
    p.drawnRoom = null;
    p.abilityUsesRemaining = 0;
  });

  game.logs = [];
  game.chatMessages = [];
  game.updatedAt = Date.now();

  res.json({ success: true, game: sanitizeGameState(game, playerId) });
});

// 20. Update Settings
app.post('/api/games/:gameId/host/update-settings', (req: Request, res: Response) => {
  const gameId = req.params.gameId.toUpperCase();
  const { playerId, settings } = req.body;
  const game = games[gameId];

  if (!game) {
    res.status(404).json({ error: '게임을 찾을 수 없습니다.' });
    return;
  }
  if (game.hostId !== playerId) {
    res.status(403).json({ error: '방장만 설정을 수정할 수 있습니다.' });
    return;
  }

  if (settings) {
    game.settings = { ...game.settings, ...settings };
    if (settings.maxRounds) game.maxRound = settings.maxRounds;
  }

  game.updatedAt = Date.now();
  res.json({ success: true, game: sanitizeGameState(game, playerId) });
});

// Public room chat (near-real-time through the existing 1s game-state sync)
const lastChatAt: Record<string, number> = {};
app.post('/api/games/:gameId/chat', (req: Request, res: Response) => {
  const gameId = (req.params.gameId || '').toUpperCase();
  const { playerId, message } = req.body;
  const game = games[gameId];

  if (!game) {
    res.status(404).json({ error: '게임을 찾을 수 없습니다.' });
    return;
  }

  const player = game.players.find((p) => p.id === playerId);
  if (!player) {
    res.status(404).json({ error: '플레이어를 찾을 수 없습니다.' });
    return;
  }

  if (game.status === 'GAME_OVER') {
    res.status(400).json({ error: '종료된 게임에서는 채팅을 보낼 수 없습니다.' });
    return;
  }

  if (game.status !== 'LOBBY' && player.status !== 'ALIVE') {
    res.status(403).json({ error: '사망하거나 제외된 플레이어는 채팅을 읽을 수만 있습니다.' });
    return;
  }

  if (typeof message !== 'string') {
    res.status(400).json({ error: '메시지를 입력해주세요.' });
    return;
  }

  const cleanMessage = message.replace(/\s+/g, ' ').trim();
  if (!cleanMessage) {
    res.status(400).json({ error: '메시지를 입력해주세요.' });
    return;
  }
  if (cleanMessage.length > 300) {
    res.status(400).json({ error: '채팅은 최대 300자까지 입력할 수 있습니다.' });
    return;
  }

  const throttleKey = `${gameId}:${playerId}`;
  const now = Date.now();
  if (lastChatAt[throttleKey] && now - lastChatAt[throttleKey] < 400) {
    res.status(429).json({ error: '메시지를 너무 빠르게 보내고 있습니다.' });
    return;
  }
  lastChatAt[throttleKey] = now;

  if (!game.chatMessages) game.chatMessages = [];
  game.chatMessages.push({
    id: generateId(),
    playerId: player.id,
    nickname: player.nickname,
    message: cleanMessage,
    timestamp: now,
    round: game.round,
    phase: game.phase,
  });

  if (game.chatMessages.length > 200) {
    game.chatMessages = game.chatMessages.slice(-200);
  }

  game.updatedAt = now;
  res.json({ success: true, game: sanitizeGameState(game, playerId) });
});

// Lightweight health endpoint for Render/Railway/Fly.io health checks
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ ok: true, games: Object.keys(games).length, uptime: Math.round(process.uptime()) });
});

// ================= VITE INTEGRATION =================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Killer Game Server running on port ${PORT}`);
    console.log(`[store] data file: ${DATA_FILE}`);
  });
}

startServer();
