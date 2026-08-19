import { GameState, GameMode, RoomId, PlayerStatus, GameSettings, TeamType } from './types';

const API_BASE = '/api/games';

export async function createGame(nickname: string): Promise<{ gameId: string; playerId: string; game: GameState }> {
  const res = await fetch(`${API_BASE}/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '게임 생성에 실패했습니다.');
  return data;
}

export async function joinGame(
  gameId: string,
  nickname: string,
  playerId?: string
): Promise<{ gameId: string; playerId: string; game: GameState }> {
  const res = await fetch(`${API_BASE}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gameId, nickname, playerId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '게임 참가에 실패했습니다.');
  return data;
}


export async function leaveGame(gameId: string, playerId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/${gameId}/leave`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '게임 방 나가기에 실패했습니다.');
}

export async function fetchGameState(gameId: string, playerId?: string): Promise<GameState> {
  const url = playerId
    ? `${API_BASE}/${gameId}?playerId=${encodeURIComponent(playerId)}`
    : `${API_BASE}/${gameId}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '게임 상태를 불러올 수 없습니다.');
  return data.game;
}

export async function updateGameMode(
  gameId: string,
  playerId: string,
  mode: GameMode,
  roleMapping?: Record<string, string>
): Promise<GameState> {
  const res = await fetch(`${API_BASE}/${gameId}/mode`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId, mode, roleMapping }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '모드 변경에 실패했습니다.');
  return data.game;
}

export async function fillBots(gameId: string, playerId: string): Promise<GameState> {
  const res = await fetch(`${API_BASE}/${gameId}/host/fill-bots`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '봇 추가에 실패했습니다.');
  return data.game;
}

export async function startGame(gameId: string, playerId: string): Promise<GameState> {
  const res = await fetch(`${API_BASE}/${gameId}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '게임 시작에 실패했습니다.');
  return data.game;
}

export async function drawRoom(
  gameId: string,
  playerId: string,
  usePass: boolean,
  designatedRoom?: RoomId
): Promise<GameState> {
  const res = await fetch(`${API_BASE}/${gameId}/draw-room`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId, usePass, designatedRoom }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '방 뽑기에 실패했습니다.');
  return data.game;
}

export async function selectRoom(
  gameId: string,
  playerId: string,
  room: RoomId,
  confirm: boolean,
  usePass?: boolean
): Promise<GameState> {
  const res = await fetch(`${API_BASE}/${gameId}/select-room`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId, room, confirm, usePass }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '방 선택에 실패했습니다.');
  return data.game;
}

export async function setPhase(
  gameId: string,
  playerId: string,
  phase: string
): Promise<GameState> {
  const res = await fetch(`${API_BASE}/${gameId}/set-phase`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId, phase }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '단계 변경에 실패했습니다.');
  return data.game;
}

export async function skipDiscussion(gameId: string, playerId: string): Promise<GameState> {
  const res = await fetch(`${API_BASE}/${gameId}/skip-discussion`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '대화 건너뛰기에 실패했습니다.');
  return data.game;
}

export async function policeArrest(
  gameId: string,
  playerId: string,
  targetPlayerId: string
): Promise<{ success: boolean; isRealKiller: boolean; targetNickname: string; game: GameState }> {
  const res = await fetch(`${API_BASE}/${gameId}/police-arrest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId, targetPlayerId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '체포 집행에 실패했습니다.');
  return data;
}

export async function corruptPoliceArrest(
  gameId: string,
  playerId: string,
  targetPlayerId: string
): Promise<GameState> {
  const res = await fetch(`${API_BASE}/${gameId}/corrupt-police-arrest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId, targetPlayerId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '동귀어진 체포에 실패했습니다.');
  return data.game;
}

export async function wardenJail(
  gameId: string,
  playerId: string,
  targetPlayerId: string | null
): Promise<GameState> {
  const res = await fetch(`${API_BASE}/${gameId}/warden-jail`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId, targetPlayerId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '감옥 수감 지정에 실패했습니다.');
  return data.game;
}

export async function gamblerBet(
  gameId: string,
  playerId: string,
  betTeam: 'citizen' | 'killer'
): Promise<GameState> {
  const res = await fetch(`${API_BASE}/${gameId}/gambler-bet`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId, betTeam }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '베팅에 실패했습니다.');
  return data.game;
}

export async function usePrisonPass(gameId: string, playerId: string): Promise<GameState> {
  const res = await fetch(`${API_BASE}/${gameId}/use-prison-pass`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '탈옥권 사용에 실패했습니다.');
  return data.game;
}

export async function resolveRound(gameId: string, playerId: string): Promise<GameState> {
  const res = await fetch(`${API_BASE}/${gameId}/resolve-round`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '라운드 정산에 실패했습니다.');
  return data.game;
}

export async function nextRound(gameId: string, playerId: string): Promise<GameState> {
  const res = await fetch(`${API_BASE}/${gameId}/next-round`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '다음 라운드 진행에 실패했습니다.');
  return data.game;
}

export async function hostUpdatePlayer(
  gameId: string,
  playerId: string,
  targetPlayerId: string,
  newStatus?: PlayerStatus,
  newRoom?: RoomId
): Promise<GameState> {
  const res = await fetch(`${API_BASE}/${gameId}/host/update-player`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId, targetPlayerId, newStatus, newRoom }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '플레이어 상태 변경에 실패했습니다.');
  return data.game;
}

export async function hostEndGame(
  gameId: string,
  playerId: string,
  winner: TeamType,
  winnerReason: string
): Promise<GameState> {
  const res = await fetch(`${API_BASE}/${gameId}/host/end-game`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId, winner, winnerReason }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '게임 종료에 실패했습니다.');
  return data.game;
}

export async function hostTogglePause(gameId: string, playerId: string): Promise<GameState> {
  const res = await fetch(`${API_BASE}/${gameId}/host/toggle-pause`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '일시정지 전환에 실패했습니다.');
  return data.game;
}

export async function restartGame(gameId: string, playerId: string): Promise<GameState> {
  const res = await fetch(`${API_BASE}/${gameId}/restart`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '게임 재시작에 실패했습니다.');
  return data.game;
}

export async function hostUpdateSettings(
  gameId: string,
  playerId: string,
  settings: Partial<GameSettings>
): Promise<GameState> {
  const res = await fetch(`${API_BASE}/${gameId}/host/update-settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId, settings }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '설정 저장에 실패했습니다.');
  return data.game;
}
