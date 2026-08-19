import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import {
  BotBrain,
  BotDifficulty,
  ChatMessage,
  ExecutionResult,
  GameEvent,
  GamePhase,
  GameSettings,
  GameState,
  NightAction,
  NightActionType,
  NightResult,
  Player,
  PrivateClue,
  RoleId,
  TeamType,
  VoteEntry,
} from './src/types';
import { ROLE_POOL, ROLES } from './src/rolesData';

const app = express();
const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'games-v8.json');
const MAX_PLAYERS = 12;
const GAME_VERSION = 8;

app.use(express.json());

type StoredGame = GameState & {
  version: number;
  pausedRemainingMs?: number | null;
};

const games: Record<string, StoredGame> = {};

const DEFAULT_SETTINGS: GameSettings = {
  botDifficulty: 'NORMAL',
  roleRevealOnDeath: true,
  roleRevealSeconds: 7,
  nightSeconds: 22,
  morningSeconds: 8,
  discussionSeconds: 60,
  voteSeconds: 20,
  executionSeconds: 8,
  autoStartDelaySeconds: 10,
};

const BOT_NAMES = [
  '민준', '서연', '지호', '유나', '도윤', '하린', '준서', '수아', '현우', '예린', '태윤', '나은',
  '시우', '채원', '건우', '다인', '우진', '세아', '재현', '아린', '정우', '소윤', '하준', '지아',
];

function now() { return Date.now(); }
function id() { return Math.random().toString(36).slice(2, 10) + now().toString(36); }
function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick<T>(items: T[]): T { return items[Math.floor(Math.random() * items.length)]; }
function shuffle<T>(input: T[]): T[] {
  const a = [...input];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function loadGames() {
  try {
    if (!fs.existsSync(DATA_FILE)) return;
    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) as Record<string, StoredGame>;
    for (const [code, game] of Object.entries(parsed)) {
      if (game.version !== GAME_VERSION) continue;
      game.settings = { ...DEFAULT_SETTINGS, ...(game.settings || {}) };
      game.chatMessages ||= [];
      game.events ||= [];
      game.nightActions ||= {};
      game.votes ||= {};
      game.lastNightResult ||= null;
      game.lastExecutionResult ||= null;
      games[code] = game;
    }
    console.log(`[store] restored ${Object.keys(games).length} v8 game(s)`);
  } catch (e) {
    console.error('[store] restore failed', e);
  }
}

let persistTimer: NodeJS.Timeout | null = null;
function persistSoon() {
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      const tmp = `${DATA_FILE}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(games), 'utf8');
      fs.renameSync(tmp, DATA_FILE);
    } catch (e) {
      console.error('[store] persist failed', e);
    }
  }, 80);
}

loadGames();

function gameCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  do {
    code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (games[code]);
  return code;
}

function roleTeam(roleId?: RoleId): TeamType | null {
  return roleId ? ROLES[roleId].team : null;
}

function alive(game: GameState): Player[] {
  return game.players.filter((p) => p.status === 'ALIVE');
}

function aliveOthers(game: GameState, playerId: string): Player[] {
  return alive(game).filter((p) => p.id !== playerId);
}

function activeKiller(game: GameState): Player | null {
  const priority: RoleId[] = ['killer', 'accomplice', 'spy'];
  for (const r of priority) {
    const p = game.players.find((x) => x.status === 'ALIVE' && x.roleId === r);
    if (p) return p;
  }
  return null;
}

function requiredNightAction(game: GameState, player: Player): NightActionType | null {
  if (player.status !== 'ALIVE' || game.phase !== 'NIGHT') return null;
  const killer = activeKiller(game);
  if (killer?.id === player.id) return 'KILL';
  switch (player.roleId) {
    case 'spy': return 'SPY_SCAN';
    case 'accomplice': return 'BLOCK';
    case 'police': return 'POLICE_CHECK';
    case 'doctor': return 'HEAL';
    case 'bodyguard': return 'GUARD';
    case 'detective': return 'TRACK';
    case 'psychic': return 'SENSE';
    default: return null;
  }
}

function validTargets(game: GameState, actor: Player, type: NightActionType): Player[] {
  let candidates = alive(game);
  if (type !== 'HEAL') candidates = candidates.filter((p) => p.id !== actor.id);
  if (type === 'KILL' || type === 'SPY_SCAN' || type === 'BLOCK') {
    candidates = candidates.filter((p) => roleTeam(p.roleId) !== 'killer');
  }
  return candidates;
}

function addEvent(game: GameState, title: string, body: string, type: GameEvent['type'] = 'info') {
  const event: GameEvent = { id: id(), round: game.round, phase: game.phase, title, body, type, timestamp: now() };
  game.events.unshift(event);
  if (game.events.length > 80) game.events.length = 80;
}

function addSystemChat(game: GameState, message: string) {
  const chat: ChatMessage = {
    id: id(), playerId: 'SYSTEM', nickname: '게임 진행', message, timestamp: now(), round: game.round, isBot: false, system: true,
  };
  game.chatMessages.push(chat);
  if (game.chatMessages.length > 240) game.chatMessages.splice(0, game.chatMessages.length - 240);
}

function addPrivateClue(player: Player, clue: Omit<PrivateClue, 'id' | 'createdAt'>) {
  player.privateClues.push({ ...clue, id: id(), createdAt: now() });
  if (player.privateClues.length > 30) player.privateClues.splice(0, player.privateClues.length - 30);
}

function initBrain(): BotBrain {
  return {
    suspicion: {}, lastChatAt: 0, nextChatAt: 0, nextActionAt: 0,
    discussionChatCount: 0, lastProcessedChatAt: 0, roleClaims: {}, sharedClueIds: [],
    pendingReplyMessageId: undefined, lastReplyMessageId: undefined, focusTargetId: undefined,
  } as BotBrain;
}

function createPlayer(nickname: string, isHost = false, isBot = false): Player {
  return {
    id: id(), nickname, isHost, isBot, status: 'ALIVE', joinedAt: now(),
    privateClues: [], botBrain: isBot ? initBrain() : undefined,
  };
}

function normalizeNickname(raw: unknown): string {
  return String(raw || '').trim().slice(0, 16);
}

function botProfile(diff: BotDifficulty) {
  if (diff === 'EASY') return { maxChats: 2, chatMin: 12, chatMax: 24, actionMin: 6, actionMax: 15, logic: 0.35 };
  if (diff === 'HARD') return { maxChats: 4, chatMin: 5, chatMax: 11, actionMin: 2, actionMax: 7, logic: 0.9 };
  return { maxChats: 3, chatMin: 8, chatMax: 16, actionMin: 3, actionMax: 10, logic: 0.65 };
}

function resetBotPhaseState(game: GameState, phase: GamePhase) {
  const profile = botProfile(game.settings.botDifficulty);
  for (const bot of game.players.filter((p) => p.isBot && (p.status === 'ALIVE' || (p.roleId === 'ghost' && (p.ghostWhispersRemaining || 0) > 0)))) {
    bot.botBrain ||= initBrain();
    if (phase === 'DISCUSSION') {
      bot.botBrain.discussionChatCount = 0;
      const ghostDelay = bot.status === 'DEAD' && bot.roleId === 'ghost' ? rand(10, 28) : rand(profile.chatMin, profile.chatMax);
      bot.botBrain.nextChatAt = now() + ghostDelay * 1000;
      bot.botBrain.pendingReplyMessageId = undefined;
    }
    if ((phase === 'NIGHT' || phase === 'VOTE') && bot.status === 'ALIVE') {
      bot.botBrain.nextActionAt = now() + rand(profile.actionMin, profile.actionMax) * 1000;
    }
  }
}

function beginPhase(game: StoredGame, phase: GamePhase, seconds: number) {
  game.phase = phase;
  game.phaseExpiresAt = now() + seconds * 1000;
  game.updatedAt = now();
  if (phase === 'NIGHT') {
    game.nightActions = {};
    game.votes = {};
  }
  if (phase === 'VOTE') game.votes = {};
  resetBotPhaseState(game, phase);
}

function assignRoles(game: StoredGame) {
  const roles = shuffle(ROLE_POOL);
  const players = shuffle(game.players);
  players.forEach((p, i) => {
    p.roleId = roles[i];
    p.role = ROLES[roles[i]];
    p.status = 'ALIVE';
    p.revealedRole = false;
    p.mayorRevealed = false;
    p.ghostWhispersRemaining = p.roleId === 'ghost' ? 2 : 0;
    p.privateClues = [];
    if (p.isBot) p.botBrain = initBrain();
  });
}

function startInternal(game: StoredGame) {
  if (game.players.length !== MAX_PLAYERS) return false;
  assignRoles(game);
  game.status = 'PLAYING';
  game.round = 1;
  game.winner = null;
  game.winnerReason = null;
  game.pendingWinner = null;
  game.pendingWinnerReason = null;
  game.lastNightResult = null;
  game.lastExecutionResult = null;
  game.chatMessages = [];
  game.events = [];
  game.lobbyAutoStartAt = null;
  addEvent(game, '게임 시작', '각자의 역할을 확인하세요. 잠시 후 첫 번째 밤이 시작됩니다.', 'info');
  beginPhase(game, 'ROLE_REVEAL', game.settings.roleRevealSeconds);
  persistSoon();
  return true;
}

function calculateWinner(game: GameState): { winner: TeamType; reason: string } | null {
  const living = alive(game);
  const killerCount = living.filter((p) => roleTeam(p.roleId) === 'killer').length;
  const citizenCount = living.filter((p) => roleTeam(p.roleId) === 'citizen').length;
  if (killerCount === 0) return { winner: 'citizen', reason: '살인마 진영이 모두 탈락했습니다.' };
  if (killerCount >= citizenCount) return { winner: 'killer', reason: '살인마 진영의 수가 시민 진영과 같거나 많아졌습니다.' };
  return null;
}

function queueWinnerIfNeeded(game: StoredGame) {
  const result = calculateWinner(game);
  if (result) {
    game.pendingWinner = result.winner;
    game.pendingWinnerReason = result.reason;
  }
}

function finishPendingWinner(game: StoredGame): boolean {
  if (!game.pendingWinner) return false;
  game.status = 'GAME_OVER';
  game.winner = game.pendingWinner;
  game.winnerReason = game.pendingWinnerReason || '';
  game.phaseExpiresAt = null;
  game.players.forEach((p) => { p.revealedRole = true; });
  addEvent(game, game.winner === 'citizen' ? '시민 진영 승리' : '살인마 진영 승리', game.winnerReason || '', 'win');
  return true;
}

function actionTargetName(game: GameState, action?: NightAction): string | null {
  if (!action) return null;
  return game.players.find((p) => p.id === action.targetPlayerId)?.nickname || null;
}

function resolveNight(game: StoredGame) {
  const killer = activeKiller(game);
  if (killer && !game.nightActions[killer.id]) {
    const choices = validTargets(game, killer, 'KILL');
    if (choices.length) game.nightActions[killer.id] = { actorId: killer.id, type: 'KILL', targetPlayerId: pick(choices).id, submittedAt: now(), auto: true };
  }

  const actions = { ...game.nightActions };
  const blockAction = Object.values(actions).find((a) => a.type === 'BLOCK');
  const blockedId = blockAction?.targetPlayerId || null;
  const effective = Object.values(actions).filter((a) => a.actorId !== blockedId);
  const byType = (type: NightActionType) => effective.find((a) => a.type === type);

  const kill = byType('KILL');
  const heal = byType('HEAL');
  const guard = byType('GUARD');
  const deaths: Player[] = [];
  let prevented = false;

  if (kill) {
    const victim = game.players.find((p) => p.id === kill.targetPlayerId && p.status === 'ALIVE');
    if (victim) {
      if (heal?.targetPlayerId === victim.id) {
        prevented = true;
      } else if (guard?.targetPlayerId === victim.id) {
        const guardPlayer = game.players.find((p) => p.id === guard.actorId && p.status === 'ALIVE');
        if (guardPlayer) {
          if (heal?.targetPlayerId === guardPlayer.id) prevented = true;
          else deaths.push(guardPlayer);
        } else {
          deaths.push(victim);
        }
      } else {
        deaths.push(victim);
      }
    }
  }

  for (const d of deaths) {
    d.status = 'DEAD';
    if (game.settings.roleRevealOnDeath) d.revealedRole = true;
  }

  for (const action of effective) {
    const actor = game.players.find((p) => p.id === action.actorId);
    const target = game.players.find((p) => p.id === action.targetPlayerId);
    if (!actor || !target) continue;
    if (action.type === 'POLICE_CHECK') {
      const isKiller = roleTeam(target.roleId) === 'killer';
      addPrivateClue(actor, {
        round: game.round, source: '경찰 조사', targetPlayerId: target.id,
        resultCode: isKiller ? 'KILLER' : 'CITIZEN',
        text: `${target.nickname}님은 ${isKiller ? '🔴 살인마 진영' : '🟢 시민 진영'}입니다.`,
      });
    }
    if (action.type === 'SPY_SCAN') {
      const special = target.roleId !== 'citizen';
      addPrivateClue(actor, {
        round: game.round, source: '스파이 탐색', targetPlayerId: target.id,
        resultCode: special ? 'SPECIAL' : 'PLAIN',
        text: `${target.nickname}님은 ${special ? '특수능력을 가진 역할' : '일반 시민 역할'}입니다.`,
      });
    }
    if (action.type === 'TRACK') {
      const targetAction = effective.find((a) => a.actorId === target.id);
      const visited = actionTargetName(game, targetAction);
      addPrivateClue(actor, {
        round: game.round, source: '탐정 추적', targetPlayerId: target.id,
        resultCode: visited ? 'VISITED' : 'NO_ACTION',
        text: visited ? `${target.nickname}님은 밤에 ${visited}님에게 행동했습니다.` : `${target.nickname}님은 밤에 아무에게도 능력을 사용하지 않았습니다.`,
      });
    }
    if (action.type === 'SENSE') {
      const targetAction = effective.find((a) => a.actorId === target.id);
      addPrivateClue(actor, {
        round: game.round, source: '초감각', targetPlayerId: target.id,
        resultCode: targetAction ? 'ACTED' : 'NO_ACTION',
        text: `${target.nickname}님에게서 ${targetAction ? '능력을 사용한 흔적이 감지되었습니다.' : '능력 사용 흔적이 감지되지 않았습니다.'}`,
      });
    }
  }

  const deathInfo = deaths.map((p) => ({
    playerId: p.id,
    nickname: p.nickname,
    roleName: game.settings.roleRevealOnDeath && p.roleId ? ROLES[p.roleId].name : undefined,
  }));
  const message = deathInfo.length
    ? `${deathInfo.map((d) => d.nickname).join(', ')}님이 지난밤 사망했습니다.`
    : prevented ? '지난밤 공격이 있었지만 아무도 사망하지 않았습니다.' : '지난밤 아무도 사망하지 않았습니다.';

  const result: NightResult = { round: game.round, deaths: deathInfo, prevented, message };
  game.lastNightResult = result;
  addEvent(game, '아침 결과', message, deathInfo.length ? 'death' : 'info');
  addSystemChat(game, `☀️ ${message}`);
  updateBrainsAfterNight(game, deaths);
  queueWinnerIfNeeded(game);
}

function resolveVote(game: StoredGame) {
  for (const p of alive(game)) {
    if (!game.votes[p.id] && p.isBot) runBotVote(game, p, true);
  }
  const counts: Record<string, number> = {};
  const breakdown = Object.values(game.votes).map((v) => {
    counts[v.targetPlayerId] = (counts[v.targetPlayerId] || 0) + v.weight;
    const voter = game.players.find((p) => p.id === v.voterId)!;
    const target = game.players.find((p) => p.id === v.targetPlayerId)!;
    return { voterNickname: voter?.nickname || '?', targetNickname: target?.nickname || '?', weight: v.weight };
  });

  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  let eliminated: Player | undefined;
  let tied = false;
  if (entries.length) {
    const max = entries[0][1];
    const top = entries.filter(([, score]) => score === max);
    if (top.length === 1) eliminated = game.players.find((p) => p.id === top[0][0] && p.status === 'ALIVE');
    else tied = true;
  } else tied = true;

  if (eliminated) {
    eliminated.status = 'DEAD';
    if (game.settings.roleRevealOnDeath) eliminated.revealedRole = true;
  }

  const message = eliminated
    ? `${eliminated.nickname}님이 투표로 탈락했습니다.${game.settings.roleRevealOnDeath && eliminated.roleId ? ` 역할은 ${ROLES[eliminated.roleId].emoji} ${ROLES[eliminated.roleId].name}입니다.` : ''}`
    : '최다 득표가 동률이라 이번 투표에서는 아무도 탈락하지 않았습니다.';

  const result: ExecutionResult = {
    round: game.round,
    eliminated: eliminated ? {
      playerId: eliminated.id, nickname: eliminated.nickname,
      roleName: game.settings.roleRevealOnDeath && eliminated.roleId ? ROLES[eliminated.roleId].name : undefined,
    } : undefined,
    tied,
    message,
    breakdown,
  };
  game.lastExecutionResult = result;
  addEvent(game, '투표 결과', message, eliminated ? 'vote' : 'info');
  addSystemChat(game, `🗳️ ${message}`);
  updateBrainsAfterVote(game, result);
  queueWinnerIfNeeded(game);
}

function clampSuspicion(value: number) { return Math.max(-100, Math.min(100, value)); }
function changeSuspicion(bot: Player, targetId: string, delta: number) {
  bot.botBrain ||= initBrain();
  const current = bot.botBrain.suspicion[targetId] || 0;
  bot.botBrain.suspicion[targetId] = clampSuspicion(current + delta);
}

function updateBrainsFromChat(game: GameState, msg: ChatMessage) {
  if (msg.system) return;
  const text = msg.message.replace(/\s+/g, ' ');
  const accuse = /(수상|의심|살인마|거짓|이상해|이상하|찜찜|몰아)/.test(text);
  const trust = /(믿어|믿음|시민 같|시민같|괜찮아|확실히 시민)/.test(text);
  const roleWords: Array<[string, RoleId]> = [
    ['경찰', 'police'], ['의사', 'doctor'], ['경호원', 'bodyguard'], ['탐정', 'detective'], ['초감각', 'psychic'], ['시장', 'mayor'], ['유령', 'ghost'],
  ];

  for (const bot of game.players.filter((p) => p.isBot && (p.status === 'ALIVE' || (p.roleId === 'ghost' && (p.ghostWhispersRemaining || 0) > 0)))) {
    bot.botBrain ||= initBrain();
    if (msg.timestamp <= bot.botBrain.lastProcessedChatAt) continue;
    const factor = game.settings.botDifficulty === 'HARD' ? 1.5 : game.settings.botDifficulty === 'EASY' ? 0.6 : 1;
    for (const target of alive(game)) {
      if (target.id === msg.playerId) continue;
      if (text.includes(target.nickname)) {
        if (accuse) changeSuspicion(bot, target.id, 4 * factor);
        if (trust) changeSuspicion(bot, target.id, -3 * factor);
      }
    }
    if (msg.playerId !== bot.id) {
      for (const [word, roleId] of roleWords) {
        const selfClaim = (text.includes(`내가 ${word}`) || text.includes(`나는 ${word}`) || text.includes(`난 ${word}`) || text.includes(`${word}이야`) || text.includes(`${word}입니다`));
        if (!selfClaim) continue;
        const existing = Object.entries(bot.botBrain.roleClaims).find(([pid, rid]) => rid === roleId && pid !== msg.playerId);
        bot.botBrain.roleClaims[msg.playerId] = roleId;
        if (existing) {
          changeSuspicion(bot, msg.playerId, 8 * factor);
          changeSuspicion(bot, existing[0], 8 * factor);
        }
      }
    }
    bot.botBrain.lastProcessedChatAt = msg.timestamp;
  }
}

function updateBrainsAfterNight(game: GameState, deaths: Player[]) {
  if (!deaths.length || !game.settings.roleRevealOnDeath) return;
  for (const bot of game.players.filter((p) => p.isBot && p.status === 'ALIVE')) {
    for (const dead of deaths) {
      if (bot.botBrain?.roleClaims[dead.id]) {
        const claim = bot.botBrain.roleClaims[dead.id];
        if (dead.roleId && claim === dead.roleId) changeSuspicion(bot, dead.id, -5);
      }
    }
  }
}

function updateBrainsAfterVote(game: GameState, result: ExecutionResult) {
  if (!result.eliminated) return;
  const eliminated = game.players.find((p) => p.id === result.eliminated?.playerId);
  if (!eliminated || !game.settings.roleRevealOnDeath) return;
  const eliminatedTeam = roleTeam(eliminated.roleId);
  for (const bot of game.players.filter((p) => p.isBot && p.status === 'ALIVE' && roleTeam(p.roleId) === 'citizen')) {
    for (const item of result.breakdown) {
      const voter = game.players.find((p) => p.nickname === item.voterNickname);
      if (!voter) continue;
      if (item.targetNickname === eliminated.nickname) {
        changeSuspicion(bot, voter.id, eliminatedTeam === 'killer' ? -4 : 3);
      } else if (eliminatedTeam === 'killer') {
        changeSuspicion(bot, voter.id, 1.5);
      }
    }
  }
}

function clueSuspicionBonus(bot: Player, targetId: string): number {
  let bonus = 0;
  for (const clue of bot.privateClues) {
    if (clue.targetPlayerId !== targetId) continue;
    if (clue.resultCode === 'KILLER') bonus += 90;
    if (clue.resultCode === 'CITIZEN') bonus -= 35;
    if (clue.resultCode === 'ACTED') bonus += 8;
    if (clue.resultCode === 'SPECIAL' && roleTeam(bot.roleId) === 'killer') bonus += 30;
  }
  return bonus;
}

function suspicionScore(bot: Player, target: Player): number {
  const base = bot.botBrain?.suspicion[target.id] || 0;
  return base + clueSuspicionBonus(bot, target.id) + Math.random() * 6;
}

function chooseCitizenBotTarget(game: GameState, bot: Player): Player | null {
  const targets = aliveOthers(game, bot.id).filter((p) => roleTeam(p.roleId) !== (roleTeam(bot.roleId) === 'killer' ? 'killer' : null));
  if (!targets.length) return null;
  if (game.settings.botDifficulty === 'EASY' && Math.random() < 0.55) return pick(targets);
  return [...targets].sort((a, b) => suspicionScore(bot, b) - suspicionScore(bot, a))[0];
}

function chooseKillerVictim(game: GameState, bot: Player): Player | null {
  const targets = alive(game).filter((p) => roleTeam(p.roleId) === 'citizen');
  if (!targets.length) return null;
  const claims = bot.botBrain?.roleClaims || {};
  const valuable: RoleId[] = ['police', 'doctor', 'detective', 'psychic', 'bodyguard'];
  const ranked = targets.map((p) => {
    const claimed = claims[p.id];
    const claimBonus = claimed && valuable.includes(claimed) ? 35 : 0;
    const socialTrust = -(bot.botBrain?.suspicion[p.id] || 0);
    return { p, score: claimBonus + socialTrust + Math.random() * 20 };
  }).sort((a, b) => b.score - a.score);
  if (game.settings.botDifficulty === 'EASY') return pick(targets);
  return ranked[0].p;
}

function botNightTarget(game: GameState, bot: Player, type: NightActionType): Player | null {
  const targets = validTargets(game, bot, type);
  if (!targets.length) return null;
  if (type === 'KILL') return chooseKillerVictim(game, bot);
  if (type === 'HEAL' || type === 'GUARD') {
    // Citizen-side bots never inspect hidden teams here. They may only avoid a publicly revealed killer.
    const publiclySafe = targets.filter((p) => !(p.revealedRole && roleTeam(p.roleId) === 'killer'));
    const pool = publiclySafe.length ? publiclySafe : targets;
    const claims = bot.botBrain?.roleClaims || {};
    const protectedRoleClaims: RoleId[] = ['police', 'detective', 'psychic'];
    const priority = pool.filter((p) => claims[p.id] && protectedRoleClaims.includes(claims[p.id]));
    if (priority.length && game.settings.botDifficulty !== 'EASY') return pick(priority);
    return pick(pool);
  }
  if (type === 'SPY_SCAN' || type === 'BLOCK') {
    const claims = bot.botBrain?.roleClaims || {};
    const priority = targets.filter((p) => claims[p.id] && claims[p.id] !== 'mayor');
    if (priority.length && game.settings.botDifficulty !== 'EASY') return pick(priority);
    return pick(targets);
  }
  return chooseCitizenBotTarget(game, bot) || pick(targets);
}

function runBotNightAction(game: StoredGame, bot: Player) {
  const type = requiredNightAction(game, bot);
  if (!type || game.nightActions[bot.id]) return;
  const target = botNightTarget(game, bot, type);
  if (!target) return;
  game.nightActions[bot.id] = { actorId: bot.id, type, targetPlayerId: target.id, submittedAt: now(), auto: true };
}

function runBotVote(game: StoredGame, bot: Player, force = false) {
  if (game.votes[bot.id] || bot.status !== 'ALIVE') return;
  let target: Player | null = null;
  if (roleTeam(bot.roleId) === 'killer') {
    const citizens = aliveOthers(game, bot.id).filter((p) => roleTeam(p.roleId) === 'citizen');
    if (!citizens.length) return;
    if (game.settings.botDifficulty === 'EASY') target = pick(citizens);
    else target = [...citizens].sort((a, b) => (bot.botBrain?.suspicion[b.id] || 0) - (bot.botBrain?.suspicion[a.id] || 0) + Math.random() * 4)[0];
  } else {
    target = chooseCitizenBotTarget(game, bot);
  }
  if (!target) return;
  const weight = bot.roleId === 'mayor' && bot.mayorRevealed ? 2 : 1;
  game.votes[bot.id] = { voterId: bot.id, targetPlayerId: target.id, weight, submittedAt: now(), auto: true };
  if (!force && allVotesDone(game)) game.phaseExpiresAt = Math.min(game.phaseExpiresAt || Infinity, now() + 1200);
}

function maybeRevealBotMayor(game: StoredGame, bot: Player) {
  if (bot.roleId !== 'mayor' || bot.mayorRevealed || game.phase !== 'DISCUSSION') return;
  const selfPressure = bot.botBrain?.suspicion[bot.id] || 0;
  const chance = game.settings.botDifficulty === 'HARD' ? 0.25 : 0.1;
  if (game.round >= 3 && Math.random() < chance || selfPressure > 20) {
    bot.mayorRevealed = true;
    bot.revealedRole = true;
    addSystemChat(game, `👑 ${bot.nickname}님이 시장임을 공개했습니다. 이제 투표권이 2표입니다.`);
    addEvent(game, '시장 공개', `${bot.nickname}님이 시장임을 공개했습니다.`, 'ability');
  }
}

function freshestUsefulClue(bot: Player): PrivateClue | null {
  bot.botBrain ||= initBrain();
  const shared = new Set((bot.botBrain as any).sharedClueIds || []);
  const clues = [...bot.privateClues].reverse();
  return clues.find((c) => !shared.has(c.id) && ['KILLER', 'CITIZEN', 'ACTED', 'VISITED', 'SPECIAL'].includes(c.resultCode || '')) || null;
}

function markClueShared(bot: Player, clue: PrivateClue) {
  bot.botBrain ||= initBrain();
  const brain: any = bot.botBrain;
  brain.sharedClueIds ||= [];
  brain.sharedClueIds.push(clue.id);
}

function findMentionedAlivePlayer(game: GameState, text: string, excludeId?: string): Player | null {
  const normalized = text.replace(/\s+/g, ' ');
  return alive(game).find((p) => p.id !== excludeId && normalized.includes(p.nickname)) || null;
}

function latestClueAbout(bot: Player, targetId: string): PrivateClue | null {
  return [...bot.privateClues].reverse().find((c) => c.targetPlayerId === targetId) || null;
}

function hasDuplicateRoleClaim(bot: Player, targetId: string): boolean {
  const claim = bot.botBrain?.roleClaims[targetId];
  if (!claim) return false;
  return Object.entries(bot.botBrain?.roleClaims || {}).some(([pid, rid]) => pid !== targetId && rid === claim);
}

function reasonForSuspicion(game: StoredGame, bot: Player, target: Player): string {
  const clue = latestClueAbout(bot, target.id);
  if (clue?.resultCode === 'KILLER') return '내가 가진 정보에서 살인마 쪽으로 잡혀서';
  if (clue?.resultCode === 'CITIZEN') return '내 정보로는 시민 쪽에 가까워 보여서 오히려 다른 사람을 보고 있어';
  if (clue?.resultCode === 'ACTED' || clue?.resultCode === 'VISITED') return '밤 행동 흔적이 확인돼서 설명을 더 듣고 싶어서';
  if (hasDuplicateRoleClaim(bot, target.id)) return '같은 역할을 주장한 사람이 겹쳐서 둘 중 하나는 거짓말일 가능성이 있어서';

  const recent = [...game.chatMessages].reverse().find((m) =>
    !m.system && m.playerId === target.id && m.round === game.round && /(의심|살인마|확실|경찰|의사|탐정|시장|시민)/.test(m.message)
  );
  if (recent) return '방금 말한 내용이 아직 확인되지 않았고 다른 발언이랑 같이 봐야 해서';

  if (game.lastExecutionResult?.breakdown?.some((v) => v.voterNickname === target.nickname)) {
    return '지난 투표 방향까지 같이 보면 조금 더 확인할 필요가 있어 보여서';
  }
  const score = bot.botBrain?.suspicion[target.id] || 0;
  if (score > 10) return '지금까지 나온 의심과 발언 흐름이 계속 그쪽으로 쌓여서';
  return '아직 결정적인 근거는 없지만 지금까지의 말 흐름에서 가장 걸려서';
}

function isQuestionLike(text: string): boolean {
  return /[?？]|누구|누굴|누가|왜|이유|근거|뭐|무엇|어때|생각|의견|의심|수상|투표|찍|역할|직업|정체|어젯밤|밤에|조사|보호|추적|믿어|맞아|아니야/.test(text);
}

function directBotAnswer(game: StoredGame, bot: Player, human: ChatMessage): string {
  bot.botBrain ||= initBrain();
  const text = human.message.replace(/\s+/g, ' ').trim();
  const asker = game.players.find((p) => p.id === human.playerId);
  const mentioned = findMentionedAlivePlayer(game, text, bot.id);
  const previousFocus = bot.botBrain.focusTargetId ? alive(game).find((p) => p.id === bot.botBrain?.focusTargetId) : undefined;
  const isFollowUp = /^(왜|왜\?|이유|근거|진짜|확실|그래서|그럼)/.test(text.replace(new RegExp(`^${bot.nickname}(아|야|님)?\\s*`), '').trim());
  const freshTarget = roleTeam(bot.roleId) === 'killer' ? chooseKillerVictim(game, bot) : chooseCitizenBotTarget(game, bot);
  const defaultTarget = isFollowUp && previousFocus ? previousFocus : freshTarget;
  const target = mentioned || defaultTarget;
  if (target) bot.botBrain.focusTargetId = target.id;
  const lower = text.toLowerCase();

  const asksRole = /(역할|직업|정체).*(뭐|뭔|무엇|알려|까|말)|너.*(뭐야|뭔데|무슨 역할|경찰|의사|시민|살인마|스파이|공범|탐정|시장)/.test(text);
  if (asksRole) {
    if (roleTeam(bot.roleId) === 'killer') return pick([
      '나는 시민 쪽이야. 정확한 역할은 지금 공개 안 할게.',
      '살인마 진영은 아니야. 역할 이름까지 까는 건 아직 위험해 보여.',
      '시민 쪽이라고만 말할게. 지금 역할 공개는 보류하고 싶어.',
    ]);
    if (bot.roleId === 'citizen' || bot.roleId === 'ghost') return '나는 시민 진영이야. 지금은 역할 이름까지 공개할 필요는 없다고 봐.';
    const strong = freshestUsefulClue(bot);
    if (strong && game.settings.botDifficulty === 'HARD') return '시민 진영의 능력 역할이야. 정보가 있어서 정확한 역할은 조금만 더 숨길게.';
    return '시민 진영이야. 능력 역할인지까지는 지금 공개하지 않을게.';
  }

  const asksWhoSuspect = /(누구|누굴|누가).*(의심|수상|살인마|찍|투표)|의심.*(누구|누굴|누가)|1순위|제일.*수상/.test(text);
  if (asksWhoSuspect && target) {
    return `지금은 ${target.nickname}님을 제일 의심해. ${reasonForSuspicion(game, bot, target)}.`;
  }

  const asksAboutMe = /(나|나를|내가|나는|난).*(의심|수상|어때|믿|살인마|뭐 같|어떻게 봐)|너.*나.*(의심|어때|믿|어떻게 봐)/.test(text);
  if (asksAboutMe && asker) {
    const score = suspicionScore(bot, asker);
    if (score >= 12) return `${asker.nickname}님도 조금 의심하고 있어. ${reasonForSuspicion(game, bot, asker)}.`;
    if (score <= -8) return `${asker.nickname}님은 지금은 비교적 덜 의심해. 다만 완전히 확정한 건 아니야.`;
    return `${asker.nickname}님은 아직 반반이야. 지금 나온 정보만으로는 시민이라고도 살인마라고도 못 박겠어.`;
  }

  const asksWhy = /^(왜|왜\?)|(왜|이유|근거).*(의심|수상|찍|투표)|왜.*(그래|그렇게|걔|쟤)/.test(text);
  if (asksWhy) {
    const whyTarget = mentioned || defaultTarget;
    if (whyTarget) {
      const clue = latestClueAbout(bot, whyTarget.id);
      if (clue?.resultCode === 'CITIZEN') return `${whyTarget.nickname}님은 오히려 덜 의심해. 내 정보로는 시민 쪽에 가까워 보여.`;
      return `${whyTarget.nickname}님을 보는 이유는 ${reasonForSuspicion(game, bot, whyTarget)}야.`;
    }
    return '아직 확실한 근거는 없어. 그래서 지금은 한 명을 단정하기보다 발언이랑 투표 흐름을 더 보려는 중이야.';
  }

  const asksNight = /(어젯밤|밤에|밤).*?(누구|누굴|뭐|무엇|행동|조사|보호|추적|봤|했)/.test(text);
  if (asksNight) {
    const action = game.nightActions[bot.id];
    const actionTarget = action ? game.players.find((p) => p.id === action.targetPlayerId) : undefined;
    const clue = [...bot.privateClues].reverse().find((c) => c.round === game.round || c.round === game.round - 1);
    if (roleTeam(bot.roleId) === 'killer') return '밤 행동은 지금 공개 안 할게. 그걸 바로 까면 살인마가 정보 역할을 찾기 너무 쉬워져.';
    if (clue?.resultCode === 'KILLER' && clue.targetPlayerId) {
      const t = game.players.find((p) => p.id === clue.targetPlayerId);
      if (t) return `이건 말할 가치가 있어. ${t.nickname}님 쪽에서 아주 강하게 수상한 결과가 나왔어.`;
    }
    if (clue?.resultCode === 'CITIZEN' && clue.targetPlayerId) {
      const t = game.players.find((p) => p.id === clue.targetPlayerId);
      if (t) return `${t.nickname}님은 내가 가진 정보로는 시민 쪽에 가까워 보여.`;
    }
    if (actionTarget && game.settings.botDifficulty !== 'EASY') return `어젯밤 ${actionTarget.nickname}님 쪽을 확인했어. 결과까지 전부 공개할지는 조금 더 보고 말할게.`;
    return '밤에 한 행동이 있더라도 지금 전부 공개하진 않을게. 필요한 정보가 생기면 힌트로 말할게.';
  }

  const asksVote = /(누구|누굴).*(투표|찍)|투표.*(누구|누굴)|누구한테.*표/.test(text);
  if (asksVote && target) return `지금 투표라면 ${target.nickname}님 쪽으로 갈 생각이야. ${reasonForSuspicion(game, bot, target)}.`;

  const asksOpinionOnNamed = !!mentioned && /(어때|생각|수상|의심|믿|어떻게 봐|어케 봐)/.test(text);
  if (asksOpinionOnNamed && mentioned) {
    const score = suspicionScore(bot, mentioned);
    if (score >= 10) return `${mentioned.nickname}님은 꽤 수상하게 보고 있어. ${reasonForSuspicion(game, bot, mentioned)}.`;
    if (score <= -8) return `${mentioned.nickname}님은 현재는 덜 의심해. 내 정보와 지금까지 흐름상 우선순위가 낮아.`;
    return `${mentioned.nickname}님은 아직 애매해. 더 말 들어보고 투표 직전에 판단하고 싶어.`;
  }

  const asksGeneralOpinion = /(생각|의견|어때|어떻게 봐|어케 봐|뭐 같)/.test(text) || lower.endsWith('?');
  if (asksGeneralOpinion && target) {
    return `내 생각은 지금 ${target.nickname}님을 한 번 더 확인해야 한다는 쪽이야. ${reasonForSuspicion(game, bot, target)}.`;
  }

  if (text.includes(bot.nickname)) {
    if (/(수상|의심|살인마|거짓)/.test(text) && target) return `나를 의심할 수는 있어. 근데 내 쪽만 보지 말고 ${target.nickname}님 발언도 같이 봐줘. ${reasonForSuspicion(game, bot, target)}.`;
    return target ? `응, 보고 있어. 지금 내 1순위는 ${target.nickname}님이야. 궁금한 거 있으면 더 물어봐.` : '응. 지금 정보가 많진 않아서 조금 더 듣고 판단할게.';
  }

  return target ? `질문에 답하면, 지금은 ${target.nickname}님 쪽을 가장 확인하고 싶어. 아직 확정은 아니야.` : '지금은 확정할 사람이 없어. 나온 정보부터 하나씩 맞춰보자.';
}

function botDiscussionMessage(game: StoredGame, bot: Player): string {
  bot.botBrain ||= initBrain();
  const profile = botProfile(game.settings.botDifficulty);
  const others = aliveOthers(game, bot.id);
  const target = roleTeam(bot.roleId) === 'killer' ? chooseKillerVictim(game, bot) : chooseCitizenBotTarget(game, bot);
  if (target) bot.botBrain.focusTargetId = target.id;
  const clue = freshestUsefulClue(bot);

  if (clue && Math.random() < profile.logic) {
    const t = game.players.find((p) => p.id === clue.targetPlayerId);
    if (t) {
      markClueShared(bot, clue);
      if (clue.resultCode === 'KILLER') return pick([
        `${t.nickname}님 쪽은 오늘 꼭 확인했으면 해. 꽤 강한 근거가 있어.`,
        `나는 ${t.nickname}님을 가장 의심해. 그냥 감이 아니라 이유가 있어.`,
        `${t.nickname}님은 오늘 투표 후보에서 빼면 안 될 것 같아.`,
      ]);
      if (clue.resultCode === 'CITIZEN') return pick([
        `나는 일단 ${t.nickname}님은 오늘 우선순위에서 빼고 싶어.`,
        `${t.nickname}님보다 다른 쪽을 보는 게 맞을 것 같아.`,
      ]);
      if (clue.resultCode === 'VISITED' || clue.resultCode === 'ACTED') return pick([
        `${t.nickname}님, 어젯밤 행동에 대해서 설명해줄 수 있어?`,
        `${t.nickname}님 쪽에서 밤 행동 흔적이 보여. 역할 공개까지는 말고 설명은 듣고 싶어.`,
      ]);
      if (clue.resultCode === 'SPECIAL' && roleTeam(bot.roleId) === 'killer') return pick([
        `${t.nickname}님이 말을 좀 아끼는 느낌인데, 역할 있는 사람처럼 보여서 오히려 확인해보고 싶어.`,
        `${t.nickname}님 의견이 궁금해. 지금 누구 의심해?`,
      ]);
    }
  }

  const accuser = [...game.chatMessages].reverse().find((m) => !m.system && m.playerId !== bot.id && m.message.includes(bot.nickname) && /(의심|수상|살인마|이상)/.test(m.message));
  if (accuser && target && Math.random() < 0.7) return pick([
    `나를 의심하는 건 괜찮은데 근거부터 맞춰보자. 나는 ${target.nickname}님 쪽이 더 걸려.`,
    `내 이름만 올리지 말고 이유를 같이 보자. 지금은 ${target.nickname}님 발언이 더 애매해 보여.`,
  ]);

  if (target) {
    const score = bot.botBrain.suspicion[target.id] || 0;
    if (score > 8 || Math.random() < 0.45) return pick([
      `${target.nickname}님 말이 조금 걸려. 지금 누구를 제일 의심하는지 말해줄래?`,
      `나는 현재 ${target.nickname}님을 조금 더 보고 있어. 다른 사람 생각은 어때?`,
      `${target.nickname}님 쪽이 찜찜한데, 확정할 정도는 아니야. 근거 더 모아보자.`,
      `지금 바로 몰기보단 ${target.nickname}님 발언을 한 번 더 들어보고 싶어.`,
    ]);
  }

  const randomTarget = others.length ? pick(others) : null;
  if (randomTarget) return pick([
    `정보 있는 사람은 역할을 바로 까기보다 힌트만 줘도 될 것 같아.`,
    `${randomTarget.nickname}님은 지금 누구 의심해? 이유도 같이 말해줘.`,
    `지난 투표랑 오늘 말이 이어지는지 보자. 말 바뀌는 사람이 제일 위험해.`,
    `아직 확정할 사람은 없어 보여. 서로 한 명씩 의심 후보를 말해보자.`,
    `살인마 팀끼리 서로 너무 안 건드릴 수도 있으니까 감싸는 관계도 보자.`,
  ]);
  return '아직 정보가 부족해. 조금 더 얘기해보자.';
}

function runBotDiscussion(game: StoredGame, bot: Player) {
  if (game.phase !== 'DISCUSSION' || bot.status !== 'ALIVE') return;
  const profile = botProfile(game.settings.botDifficulty);
  bot.botBrain ||= initBrain();

  const pending = bot.botBrain.pendingReplyMessageId
    ? game.chatMessages.find((m) => m.id === bot.botBrain?.pendingReplyMessageId && !m.system && !m.isBot && m.round === game.round)
    : undefined;

  if (!pending && bot.botBrain.discussionChatCount >= profile.maxChats) return;
  maybeRevealBotMayor(game, bot);

  const message = pending ? directBotAnswer(game, bot, pending) : botDiscussionMessage(game, bot);
  const chat: ChatMessage = {
    id: id(), playerId: bot.id, nickname: bot.nickname, message, timestamp: now(), round: game.round, isBot: true,
    replyToMessageId: pending?.id,
  };
  game.chatMessages.push(chat);
  if (game.chatMessages.length > 240) game.chatMessages.splice(0, game.chatMessages.length - 240);
  bot.botBrain.discussionChatCount += pending ? 0 : 1;
  bot.botBrain.lastChatAt = now();
  bot.botBrain.nextChatAt = now() + rand(profile.chatMin, profile.chatMax) * 1000;
  if (pending) {
    bot.botBrain.lastReplyMessageId = pending.id;
    bot.botBrain.pendingReplyMessageId = undefined;
  }
  updateBrainsFromChat(game, chat);
}

function runBotGhostWhisper(game: StoredGame, bot: Player) {
  if (game.phase !== 'DISCUSSION' || bot.status !== 'DEAD' || bot.roleId !== 'ghost' || (bot.ghostWhispersRemaining || 0) <= 0) return;
  bot.botBrain ||= initBrain();
  const target = chooseCitizenBotTarget(game, bot);
  if (!target) return;
  const clue = latestClueAbout(bot, target.id);
  let message = `${target.nickname}님을 한 번 더 봐줘. 내가 살아 있을 때부터 조금 걸렸어.`;
  if (clue?.resultCode === 'KILLER') message = `${target.nickname}님을 꼭 의심해봐. 내가 남길 수 있는 가장 강한 힌트야.`;
  else if (clue?.resultCode === 'CITIZEN') message = `${target.nickname}님보다 다른 사람을 먼저 봐줘. 이건 내가 남기는 힌트야.`;
  else if ((bot.botBrain.suspicion[target.id] || 0) > 10) message = `${target.nickname}님 쪽 발언과 투표 흐름을 다시 확인해봐.`;

  const chat: ChatMessage = {
    id: id(), playerId: 'GHOST', nickname: '유령의 속삭임', message, timestamp: now(), round: game.round, ghost: true,
  };
  game.chatMessages.push(chat);
  updateBrainsFromChat(game, chat);
  bot.ghostWhispersRemaining = Math.max(0, (bot.ghostWhispersRemaining || 0) - 1);
  bot.botBrain.nextChatAt = now() + rand(22, 40) * 1000;
  addEvent(game, '유령의 속삭임', '탈락한 유령이 익명의 힌트를 남겼습니다.', 'ability');
}

function allNightActionsDone(game: GameState): boolean {
  const required = alive(game).filter((p) => requiredNightAction(game, p));
  return required.every((p) => !!game.nightActions[p.id]);
}
function allVotesDone(game: GameState): boolean {
  return alive(game).every((p) => !!game.votes[p.id]);
}

function tickGame(game: StoredGame) {
  const t = now();
  if (game.status === 'LOBBY') {
    if (game.players.length === MAX_PLAYERS && game.lobbyAutoStartAt && t >= game.lobbyAutoStartAt) startInternal(game);
    return;
  }
  if (game.status !== 'PLAYING') return;

  if (game.phase === 'NIGHT') {
    for (const bot of game.players.filter((p) => p.isBot && p.status === 'ALIVE')) {
      if ((bot.botBrain?.nextActionAt || Infinity) <= t) runBotNightAction(game, bot);
    }
    if (allNightActionsDone(game) && game.phaseExpiresAt && game.phaseExpiresAt - t > 1500) game.phaseExpiresAt = t + 1500;
  }
  if (game.phase === 'DISCUSSION') {
    for (const bot of game.players.filter((p) => p.isBot && p.status === 'ALIVE')) {
      if ((bot.botBrain?.nextChatAt || Infinity) <= t) runBotDiscussion(game, bot);
    }
    for (const ghost of game.players.filter((p) => p.isBot && p.status === 'DEAD' && p.roleId === 'ghost' && (p.ghostWhispersRemaining || 0) > 0)) {
      if ((ghost.botBrain?.nextChatAt || Infinity) <= t) runBotGhostWhisper(game, ghost);
    }
  }
  if (game.phase === 'VOTE') {
    for (const bot of game.players.filter((p) => p.isBot && p.status === 'ALIVE')) {
      if ((bot.botBrain?.nextActionAt || Infinity) <= t) runBotVote(game, bot);
    }
    if (allVotesDone(game) && game.phaseExpiresAt && game.phaseExpiresAt - t > 1500) game.phaseExpiresAt = t + 1500;
  }

  if (!game.phaseExpiresAt || t < game.phaseExpiresAt) return;

  if (game.phase === 'ROLE_REVEAL') {
    beginPhase(game, 'NIGHT', game.settings.nightSeconds);
    addSystemChat(game, '🌙 밤이 되었습니다. 자신의 능력이 있다면 대상을 선택하세요.');
  } else if (game.phase === 'NIGHT') {
    resolveNight(game);
    beginPhase(game, 'MORNING', game.settings.morningSeconds);
  } else if (game.phase === 'MORNING') {
    if (finishPendingWinner(game)) persistSoon();
    else {
      beginPhase(game, 'DISCUSSION', game.settings.discussionSeconds);
      addSystemChat(game, '💬 낮 토론이 시작되었습니다. 정보를 모아 살인마를 찾아보세요.');
    }
  } else if (game.phase === 'DISCUSSION') {
    beginPhase(game, 'VOTE', game.settings.voteSeconds);
    addSystemChat(game, '🗳️ 투표 시간입니다. 가장 의심되는 사람 한 명을 선택하세요.');
  } else if (game.phase === 'VOTE') {
    resolveVote(game);
    beginPhase(game, 'EXECUTION', game.settings.executionSeconds);
  } else if (game.phase === 'EXECUTION') {
    if (finishPendingWinner(game)) persistSoon();
    else {
      game.round += 1;
      if (game.round > 20) {
        game.status = 'GAME_OVER';
        game.winner = 'citizen';
        game.winnerReason = '20라운드까지 살인마가 승리하지 못해 시민 진영이 승리했습니다.';
        game.phaseExpiresAt = null;
        game.players.forEach((p) => p.revealedRole = true);
      } else {
        beginPhase(game, 'NIGHT', game.settings.nightSeconds);
        addSystemChat(game, `🌙 ROUND ${game.round}. 다시 밤이 되었습니다.`);
      }
    }
  }
  game.updatedAt = now();
  persistSoon();
}

setInterval(() => {
  for (const game of Object.values(games)) tickGame(game);
}, 500);

function publicPlayer(game: StoredGame, player: Player, viewerId?: string): Player {
  const copy: Player = JSON.parse(JSON.stringify(player));
  delete copy.botBrain;
  const viewer = viewerId ? game.players.find((p) => p.id === viewerId) : undefined;
  const sameKillerTeam = viewer && roleTeam(viewer.roleId) === 'killer' && roleTeam(player.roleId) === 'killer';
  const canSeeRole = player.id === viewerId || game.status === 'GAME_OVER' || !!player.revealedRole || !!sameKillerTeam;
  if (canSeeRole && player.roleId) copy.role = ROLES[player.roleId];
  else {
    delete copy.roleId;
    delete copy.role;
  }
  if (player.id !== viewerId) {
    copy.privateClues = [];
    delete copy.ghostWhispersRemaining;
  }
  return copy;
}

function sanitize(game: StoredGame, viewerId?: string): GameState {
  const clone: GameState = JSON.parse(JSON.stringify(game));
  clone.players = game.players.map((p) => publicPlayer(game, p, viewerId));
  const ownNight = viewerId ? game.nightActions[viewerId] : undefined;
  const ownVote = viewerId ? game.votes[viewerId] : undefined;
  clone.nightActions = ownNight && viewerId ? { [viewerId]: ownNight } : {};
  clone.votes = ownVote && viewerId ? { [viewerId]: ownVote } : {};
  clone.myNightAction = ownNight || null;
  clone.myVote = ownVote || null;
  const viewer = viewerId ? game.players.find((p) => p.id === viewerId) : undefined;
  clone.requiredNightAction = viewer ? requiredNightAction(game, viewer) : null;
  delete (clone as any).pendingWinner;
  delete (clone as any).pendingWinnerReason;
  delete (clone as any).pausedRemainingMs;
  delete (clone as any).version;
  return clone;
}

function requireGame(req: any, res: any): StoredGame | null {
  const code = String(req.params.gameId || '').toUpperCase();
  const game = games[code];
  if (!game) { res.status(404).json({ error: '게임방을 찾을 수 없습니다.' }); return null; }
  tickGame(game);
  return game;
}

function requirePlayer(game: StoredGame, playerId: unknown, res: any): Player | null {
  const p = game.players.find((x) => x.id === playerId);
  if (!p) { res.status(403).json({ error: '참가자 정보를 확인할 수 없습니다.' }); return null; }
  return p;
}

function requireHost(game: StoredGame, playerId: unknown, res: any): Player | null {
  const p = requirePlayer(game, playerId, res);
  if (!p) return null;
  if (!p.isHost) { res.status(403).json({ error: '방장만 사용할 수 있습니다.' }); return null; }
  return p;
}

app.post('/api/games/create', (req, res) => {
  const nickname = normalizeNickname(req.body.nickname);
  if (!nickname) return res.status(400).json({ error: '닉네임을 입력해주세요.' });
  const code = gameCode();
  const host = createPlayer(nickname, true, false);
  const game: StoredGame = {
    version: GAME_VERSION,
    gameId: code, hostId: host.id, status: 'LOBBY', round: 0, phase: 'ROLE_REVEAL', phaseExpiresAt: null,
    lobbyAutoStartAt: null, winner: null, winnerReason: null, players: [host], chatMessages: [], events: [],
    settings: { ...DEFAULT_SETTINGS }, createdAt: now(), updatedAt: now(), nightActions: {}, votes: {},
    lastNightResult: null, lastExecutionResult: null, pendingWinner: null, pendingWinnerReason: null,
  };
  games[code] = game;
  persistSoon();
  res.json({ gameId: code, playerId: host.id, game: sanitize(game, host.id) });
});

app.post('/api/games/join', (req, res) => {
  const code = String(req.body.gameId || '').trim().toUpperCase();
  const game = games[code];
  if (!game) return res.status(404).json({ error: '게임방을 찾을 수 없습니다.' });
  tickGame(game);
  const nickname = normalizeNickname(req.body.nickname);
  if (!nickname) return res.status(400).json({ error: '닉네임을 입력해주세요.' });

  const requestedId = String(req.body.playerId || '');
  const returning = requestedId ? game.players.find((p) => p.id === requestedId && !p.isBot) : undefined;
  if (returning) return res.json({ gameId: code, playerId: returning.id, game: sanitize(game, returning.id) });
  if (game.status !== 'LOBBY') return res.status(409).json({ error: '이미 게임이 시작되었습니다. 기존 참가자는 같은 기기에서 다시 접속해주세요.' });
  if (game.players.some((p) => p.nickname === nickname && !p.isBot)) return res.status(409).json({ error: '이미 사용 중인 닉네임입니다.' });

  let newPlayer: Player;
  if (game.players.length >= MAX_PLAYERS) {
    const botIndex = game.players.map((p, i) => ({ p, i })).reverse().find(({ p }) => p.isBot)?.i;
    if (botIndex === undefined) return res.status(409).json({ error: '게임방이 가득 찼습니다.' });
    newPlayer = createPlayer(nickname, false, false);
    game.players.splice(botIndex, 1, newPlayer);
  } else {
    newPlayer = createPlayer(nickname, false, false);
    game.players.push(newPlayer);
  }
  game.updatedAt = now();
  if (game.players.length === MAX_PLAYERS) game.lobbyAutoStartAt = now() + game.settings.autoStartDelaySeconds * 1000;
  persistSoon();
  res.json({ gameId: code, playerId: newPlayer.id, game: sanitize(game, newPlayer.id) });
});

app.get('/api/games/:gameId', (req, res) => {
  const game = requireGame(req, res); if (!game) return;
  const viewerId = typeof req.query.playerId === 'string' ? req.query.playerId : undefined;
  res.json({ game: sanitize(game, viewerId) });
});

app.post('/api/games/:gameId/leave', (req, res) => {
  const game = requireGame(req, res); if (!game) return;
  if (game.status !== 'LOBBY') return res.status(409).json({ error: '게임 시작 후에는 나갈 수 없습니다. 같은 링크로 다시 접속하면 복귀할 수 있습니다.' });
  const p = requirePlayer(game, req.body.playerId, res); if (!p) return;
  game.players = game.players.filter((x) => x.id !== p.id);
  game.lobbyAutoStartAt = null;
  if (p.isHost && game.players.length) {
    const next = game.players.find((x) => !x.isBot) || game.players[0];
    game.players.forEach((x) => x.isHost = x.id === next.id);
    game.hostId = next.id;
  }
  if (!game.players.length) delete games[game.gameId];
  persistSoon();
  res.json({ ok: true });
});

app.post('/api/games/:gameId/host/fill-bots', (req, res) => {
  const game = requireGame(req, res); if (!game) return;
  const host = requireHost(game, req.body.playerId, res); if (!host) return;
  if (game.status !== 'LOBBY') return res.status(409).json({ error: '로비에서만 BOT을 추가할 수 있습니다.' });
  const used = new Set(game.players.map((p) => p.nickname));
  while (game.players.length < MAX_PLAYERS) {
    const names = BOT_NAMES.filter((n) => !used.has(n));
    const base = names.length ? pick(names) : `BOT${game.players.length + 1}`;
    used.add(base);
    game.players.push(createPlayer(base, false, true));
  }
  game.lobbyAutoStartAt = now() + game.settings.autoStartDelaySeconds * 1000;
  game.updatedAt = now();
  persistSoon();
  res.json({ game: sanitize(game, host.id) });
});

app.post('/api/games/:gameId/host/remove-bots', (req, res) => {
  const game = requireGame(req, res); if (!game) return;
  const host = requireHost(game, req.body.playerId, res); if (!host) return;
  if (game.status !== 'LOBBY') return res.status(409).json({ error: '로비에서만 BOT을 뺄 수 있습니다.' });
  game.players = game.players.filter((p) => !p.isBot);
  game.lobbyAutoStartAt = null;
  game.updatedAt = now();
  persistSoon();
  res.json({ game: sanitize(game, host.id) });
});

app.post('/api/games/:gameId/host/settings', (req, res) => {
  const game = requireGame(req, res); if (!game) return;
  const host = requireHost(game, req.body.playerId, res); if (!host) return;
  if (game.status !== 'LOBBY') return res.status(409).json({ error: '게임 시작 전 로비에서만 설정할 수 있습니다.' });
  const input = req.body.settings || {};
  const allowedDifficulty: BotDifficulty[] = ['EASY', 'NORMAL', 'HARD'];
  if (allowedDifficulty.includes(input.botDifficulty)) game.settings.botDifficulty = input.botDifficulty;
  if (typeof input.roleRevealOnDeath === 'boolean') game.settings.roleRevealOnDeath = input.roleRevealOnDeath;
  persistSoon();
  res.json({ game: sanitize(game, host.id) });
});

app.post('/api/games/:gameId/start', (req, res) => {
  const game = requireGame(req, res); if (!game) return;
  const host = requireHost(game, req.body.playerId, res); if (!host) return;
  if (game.players.length !== MAX_PLAYERS) return res.status(400).json({ error: '12명이 모두 참가해야 시작할 수 있습니다. 빈자리는 BOT으로 채울 수 있습니다.' });
  startInternal(game);
  res.json({ game: sanitize(game, host.id) });
});

app.post('/api/games/:gameId/chat', (req, res) => {
  const game = requireGame(req, res); if (!game) return;
  const p = requirePlayer(game, req.body.playerId, res); if (!p) return;
  if (game.status !== 'PLAYING' || game.phase !== 'DISCUSSION') return res.status(409).json({ error: '낮 대화 시간에만 채팅할 수 있습니다.' });
  if (p.status !== 'ALIVE') return res.status(409).json({ error: '탈락한 플레이어는 채팅을 읽을 수만 있습니다.' });
  const message = String(req.body.message || '').trim().slice(0, 180);
  if (!message) return res.status(400).json({ error: '메시지를 입력해주세요.' });
  const chat: ChatMessage = { id: id(), playerId: p.id, nickname: p.nickname, message, timestamp: now(), round: game.round, isBot: !!p.isBot };
  game.chatMessages.push(chat);
  if (game.chatMessages.length > 240) game.chatMessages.splice(0, game.chatMessages.length - 240);
  updateBrainsFromChat(game, chat);

  // Human questions get priority over BOT monologues. If a BOT name is mentioned,
  // that BOT is the primary responder. General questions get one or two responders.
  const livingBots = game.players.filter((x) => x.isBot && x.status === 'ALIVE');
  const trimmedMessage = message.trim();
  const addressedBot = livingBots.find((x) =>
    trimmedMessage.startsWith(x.nickname) ||
    trimmedMessage.includes(`@${x.nickname}`) ||
    trimmedMessage.includes(`${x.nickname}아`) ||
    trimmedMessage.includes(`${x.nickname}야`)
  );
  const question = isQuestionLike(message);
  let responsiveBots: Player[] = [];
  if (addressedBot) responsiveBots = [addressedBot];
  else if (question) responsiveBots = shuffle(livingBots).slice(0, game.settings.botDifficulty === 'HARD' ? 2 : 1);
  else responsiveBots = shuffle(livingBots).slice(0, 1);

  const responseDelay = game.settings.botDifficulty === 'HARD' ? [1, 2] : game.settings.botDifficulty === 'EASY' ? [2, 4] : [1, 3];
  const responsiveIds = new Set(responsiveBots.map((x) => x.id));
  for (const bot of livingBots) {
    bot.botBrain ||= initBrain();
    if (responsiveIds.has(bot.id)) {
      bot.botBrain.pendingReplyMessageId = chat.id;
      bot.botBrain.nextChatAt = Math.min(bot.botBrain.nextChatAt || Infinity, now() + rand(responseDelay[0], responseDelay[1]) * 1000);
    } else if (question || addressedBot) {
      // Other BOTs wait so the direct answer is not buried under unrelated chatter.
      bot.botBrain.nextChatAt = Math.max(bot.botBrain.nextChatAt || 0, now() + rand(5, 8) * 1000);
    }
  }
  persistSoon();
  res.json({ game: sanitize(game, p.id) });
});

app.post('/api/games/:gameId/ghost-whisper', (req, res) => {
  const game = requireGame(req, res); if (!game) return;
  const p = requirePlayer(game, req.body.playerId, res); if (!p) return;
  if (game.status !== 'PLAYING' || game.phase !== 'DISCUSSION') return res.status(409).json({ error: '낮 대화 시간에만 유령의 힌트를 남길 수 있습니다.' });
  if (p.status !== 'DEAD' || p.roleId !== 'ghost') return res.status(400).json({ error: '탈락한 유령만 사용할 수 있는 능력입니다.' });
  if ((p.ghostWhispersRemaining || 0) <= 0) return res.status(409).json({ error: '유령의 속삭임을 모두 사용했습니다.' });
  const message = String(req.body.message || '').trim().slice(0, 50);
  if (!message) return res.status(400).json({ error: '힌트를 입력해주세요.' });
  const chat: ChatMessage = {
    id: id(), playerId: 'GHOST', nickname: '유령의 속삭임', message, timestamp: now(), round: game.round, ghost: true,
  };
  game.chatMessages.push(chat);
  if (game.chatMessages.length > 240) game.chatMessages.splice(0, game.chatMessages.length - 240);
  updateBrainsFromChat(game, chat);
  p.ghostWhispersRemaining = Math.max(0, (p.ghostWhispersRemaining || 0) - 1);
  addEvent(game, '유령의 속삭임', '탈락한 유령이 익명의 힌트를 남겼습니다.', 'ability');
  persistSoon();
  res.json({ game: sanitize(game, p.id) });
});

app.post('/api/games/:gameId/night-action', (req, res) => {
  const game = requireGame(req, res); if (!game) return;
  const p = requirePlayer(game, req.body.playerId, res); if (!p) return;
  if (game.status !== 'PLAYING' || game.phase !== 'NIGHT') return res.status(409).json({ error: '지금은 밤 능력을 사용할 시간이 아닙니다.' });
  if (p.status !== 'ALIVE') return res.status(409).json({ error: '탈락한 플레이어는 행동할 수 없습니다.' });
  const required = requiredNightAction(game, p);
  const type = req.body.type as NightActionType;
  if (!required || required !== type) return res.status(400).json({ error: '현재 역할에서 사용할 수 없는 능력입니다.' });
  const target = validTargets(game, p, type).find((x) => x.id === req.body.targetPlayerId);
  if (!target) return res.status(400).json({ error: '선택할 수 없는 대상입니다.' });
  game.nightActions[p.id] = { actorId: p.id, type, targetPlayerId: target.id, submittedAt: now() };
  if (allNightActionsDone(game)) game.phaseExpiresAt = Math.min(game.phaseExpiresAt || Infinity, now() + 1200);
  persistSoon();
  res.json({ game: sanitize(game, p.id) });
});

app.post('/api/games/:gameId/mayor-reveal', (req, res) => {
  const game = requireGame(req, res); if (!game) return;
  const p = requirePlayer(game, req.body.playerId, res); if (!p) return;
  if (game.status !== 'PLAYING' || game.phase !== 'DISCUSSION') return res.status(409).json({ error: '낮 대화 시간에만 시장을 공개할 수 있습니다.' });
  if (p.status !== 'ALIVE' || p.roleId !== 'mayor') return res.status(400).json({ error: '시장만 사용할 수 있는 능력입니다.' });
  if (p.mayorRevealed) return res.status(409).json({ error: '이미 시장임을 공개했습니다.' });
  p.mayorRevealed = true;
  p.revealedRole = true;
  addSystemChat(game, `👑 ${p.nickname}님이 시장임을 공개했습니다. 이후 투표권은 2표입니다.`);
  addEvent(game, '시장 공개', `${p.nickname}님이 시장임을 공개했습니다.`, 'ability');
  persistSoon();
  res.json({ game: sanitize(game, p.id) });
});

app.post('/api/games/:gameId/vote', (req, res) => {
  const game = requireGame(req, res); if (!game) return;
  const p = requirePlayer(game, req.body.playerId, res); if (!p) return;
  if (game.status !== 'PLAYING' || game.phase !== 'VOTE') return res.status(409).json({ error: '지금은 투표 시간이 아닙니다.' });
  if (p.status !== 'ALIVE') return res.status(409).json({ error: '탈락한 플레이어는 투표할 수 없습니다.' });
  const target = aliveOthers(game, p.id).find((x) => x.id === req.body.targetPlayerId);
  if (!target) return res.status(400).json({ error: '투표할 대상을 선택해주세요.' });
  const weight = p.roleId === 'mayor' && p.mayorRevealed ? 2 : 1;
  game.votes[p.id] = { voterId: p.id, targetPlayerId: target.id, weight, submittedAt: now() };
  if (allVotesDone(game)) game.phaseExpiresAt = Math.min(game.phaseExpiresAt || Infinity, now() + 1200);
  persistSoon();
  res.json({ game: sanitize(game, p.id) });
});

app.post('/api/games/:gameId/host/toggle-pause', (req, res) => {
  const game = requireGame(req, res); if (!game) return;
  const host = requireHost(game, req.body.playerId, res); if (!host) return;
  if (game.status === 'PLAYING') {
    game.pausedRemainingMs = Math.max(0, (game.phaseExpiresAt || now()) - now());
    game.status = 'PAUSED';
    game.phaseExpiresAt = null;
  } else if (game.status === 'PAUSED') {
    game.status = 'PLAYING';
    game.phaseExpiresAt = now() + Math.max(1000, game.pausedRemainingMs || 1000);
    game.pausedRemainingMs = null;
  } else return res.status(409).json({ error: '진행 중인 게임에서만 일시정지할 수 있습니다.' });
  persistSoon();
  res.json({ game: sanitize(game, host.id) });
});

app.post('/api/games/:gameId/host/return-lobby', (req, res) => {
  const game = requireGame(req, res); if (!game) return;
  const host = requireHost(game, req.body.playerId, res); if (!host) return;
  const keepBots = req.body.keepBots !== false;

  // A rematch always pauses in the lobby first. This gives late friends time to join.
  // If BOTs are kept and a human joins a full lobby, join() replaces one BOT automatically.
  if (!keepBots) game.players = game.players.filter((p) => !p.isBot);

  game.status = 'LOBBY';
  game.round = 0;
  game.phase = 'ROLE_REVEAL';
  game.phaseExpiresAt = null;
  game.lobbyAutoStartAt = null;
  game.winner = null;
  game.winnerReason = null;
  game.pendingWinner = null;
  game.pendingWinnerReason = null;
  game.nightActions = {};
  game.votes = {};
  game.chatMessages = [];
  game.events = [];
  game.lastNightResult = null;
  game.lastExecutionResult = null;
  game.players.forEach((p) => {
    p.status = 'ALIVE';
    delete p.roleId;
    delete p.role;
    p.revealedRole = false;
    p.mayorRevealed = false;
    p.ghostWhispersRemaining = 0;
    p.privateClues = [];
    if (p.isBot) p.botBrain = initBrain();
  });
  game.updatedAt = now();
  persistSoon();
  res.json({ game: sanitize(game, host.id) });
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, version: GAME_VERSION, games: Object.keys(games).length, uptime: Math.round(process.uptime()) });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Killer Game Mafia v8 running on port ${PORT}`);
    console.log(`[store] ${DATA_FILE}`);
  });
}

startServer();
