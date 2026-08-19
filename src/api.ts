import { BotDifficulty, GameSettings, GameState, NightActionType } from './types';

const API_BASE = '/api/games';

async function json<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '요청 처리에 실패했습니다.');
  return data;
}

export async function createGame(nickname: string): Promise<{ gameId: string; playerId: string; game: GameState }> {
  return json(await fetch(`${API_BASE}/create`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nickname }) }));
}

export async function joinGame(gameId: string, nickname: string, playerId?: string): Promise<{ gameId: string; playerId: string; game: GameState }> {
  return json(await fetch(`${API_BASE}/join`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gameId, nickname, playerId }) }));
}

export async function leaveGame(gameId: string, playerId: string): Promise<void> {
  await json(await fetch(`${API_BASE}/${gameId}/leave`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId }) }));
}

export async function fetchGameState(gameId: string, playerId?: string): Promise<GameState> {
  const suffix = playerId ? `?playerId=${encodeURIComponent(playerId)}` : '';
  const data = await json<{ game: GameState }>(await fetch(`${API_BASE}/${gameId}${suffix}`));
  return data.game;
}

export async function fillBots(gameId: string, playerId: string): Promise<GameState> {
  const data = await json<{ game: GameState }>(await fetch(`${API_BASE}/${gameId}/host/fill-bots`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId }) }));
  return data.game;
}

export async function removeBots(gameId: string, playerId: string): Promise<GameState> {
  const data = await json<{ game: GameState }>(await fetch(`${API_BASE}/${gameId}/host/remove-bots`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId }) }));
  return data.game;
}

export async function updateSettings(gameId: string, playerId: string, settings: Partial<GameSettings> & { botDifficulty?: BotDifficulty }): Promise<GameState> {
  const data = await json<{ game: GameState }>(await fetch(`${API_BASE}/${gameId}/host/settings`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId, settings }) }));
  return data.game;
}

export async function startGame(gameId: string, playerId: string): Promise<GameState> {
  const data = await json<{ game: GameState }>(await fetch(`${API_BASE}/${gameId}/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId }) }));
  return data.game;
}

export async function sendChat(gameId: string, playerId: string, message: string): Promise<GameState> {
  const data = await json<{ game: GameState }>(await fetch(`${API_BASE}/${gameId}/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId, message }) }));
  return data.game;
}

export async function sendGhostWhisper(gameId: string, playerId: string, message: string): Promise<GameState> {
  const data = await json<{ game: GameState }>(await fetch(`${API_BASE}/${gameId}/ghost-whisper`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId, message }) }));
  return data.game;
}

export async function submitNightAction(gameId: string, playerId: string, type: NightActionType, targetPlayerId: string): Promise<GameState> {
  const data = await json<{ game: GameState }>(await fetch(`${API_BASE}/${gameId}/night-action`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId, type, targetPlayerId }) }));
  return data.game;
}

export async function revealMayor(gameId: string, playerId: string): Promise<GameState> {
  const data = await json<{ game: GameState }>(await fetch(`${API_BASE}/${gameId}/mayor-reveal`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId }) }));
  return data.game;
}

export async function submitVote(gameId: string, playerId: string, targetPlayerId: string): Promise<GameState> {
  const data = await json<{ game: GameState }>(await fetch(`${API_BASE}/${gameId}/vote`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId, targetPlayerId }) }));
  return data.game;
}

export async function togglePause(gameId: string, playerId: string): Promise<GameState> {
  const data = await json<{ game: GameState }>(await fetch(`${API_BASE}/${gameId}/host/toggle-pause`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId }) }));
  return data.game;
}

export async function returnToLobby(gameId: string, playerId: string, keepBots = true): Promise<GameState> {
  const data = await json<{ game: GameState }>(await fetch(`${API_BASE}/${gameId}/host/return-lobby`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId, keepBots }) }));
  return data.game;
}
