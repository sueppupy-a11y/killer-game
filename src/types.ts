export type TeamType = 'citizen' | 'killer' | 'neutral';

export type PlayerStatus = 'ALIVE' | 'DEAD' | 'REMOVED' | 'PRISON';

export type GamePhase =
  | 'ROOM_DRAW'
  | 'ROOM_SELECTION'
  | 'DAY'
  | 'DISCUSSION'
  | 'PRE_SELECTION_DISCUSSION'
  | 'WARDEN_ACTION'
  | 'RESULT_DISCUSSION'
  | 'FINAL_VOTING';

export type GameMode = 'FIXED' | 'RANDOM';

export type RoomId = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export type RoomLocation = RoomId | 'PRISON';

export interface RoleDefinition {
  id: string;
  name: string;
  team: TeamType;
  teamName: string;
  tagline: string;
  description: string;
  winCondition: string;
  abilityName: string | null;
  abilityDescription: string | null;
  abilityMaxUses: number;
  abilityCondition: string | null;
}

export interface PlayerInventory {
  roomPassCount: number; // 방 지정권 개수
  prisonPassCount: number; // 탈옥권 개수
}

export interface Player {
  id: string;
  nickname: string;
  isHost: boolean;
  isBot?: boolean;
  roleId?: string; // Hidden for other players until GAME_OVER
  role?: RoleDefinition; // Populated only for self or host
  status: PlayerStatus;
  inventory: PlayerInventory;
  selectedRoom: RoomId | null; // Selected room or designated room
  randomRoomOptions?: [RoomId, RoomId] | null; // Server-generated 2 distinct room options
  roomOptionsGenerated?: boolean;
  usedRoomPassThisRound?: boolean;
  usedPrisonPassThisRound?: boolean;
  confirmedRoom: boolean;
  roomConfirmed?: boolean; // Alias for confirmedRoom
  currentRoom: RoomLocation | null; // Actual room for this round
  drawnRoom: RoomId | null; // Card draw result for animation
  isRoomRevealed?: boolean; // Card flip state
  abilityUsesRemaining: number;
  joinedAt: number;

  // Role specific private attributes
  stealCount?: number; // 소매치기 절도 횟수
  gamblerBet?: 'citizen' | 'killer' | null; // 도박꾼 베팅 진영
  extrasensoryRoomCount?: number | null; // 초감각자 방 실제 인원 수
  forensicClues?: Array<{ round: number; victimNickname: string; clue: string }>; // 법의학자 단서
  witnessClues?: Array<{ round: number; victimNickname: string; clue: string }>; // 목격자 단서
  policeAttackedAlert?: boolean; // 경찰 공격 감지 알림

  // Neutral / Personal Victory resolution
  isPersonalWinner?: boolean;
  personalWinReason?: string;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  nickname: string;
  message: string;
  timestamp: number;
  round: number;
  phase: GamePhase;
}

export interface GameLogEntry {
  id: string;
  round: number;
  message: string;
  timestamp: number;
  type: 'info' | 'death' | 'arrest' | 'win' | 'phase' | 'police' | 'warden' | 'steal';
}

export interface GameSettings {
  maxRounds: number;
  preDiscussionTimeSeconds: number; // 60s
  roomSelectionTimeSeconds: number; // 15s
  allowRoleAbilities: boolean;
  killerWinConditionText: string;
  citizenWinConditionText: string;
  neutralWinConditionText: string;
  autoAdvanceRound: boolean;
}

export interface RolePreset {
  slotNumber: number;
  roleId: string;
  roleName: string;
}

export interface GameState {
  gameId: string;
  hostId: string;
  status: 'LOBBY' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';
  mode: GameMode;
  round: number;
  maxRound: number;
  phase: GamePhase;
  phaseExpiresAt?: number | null; // Milliseconds timestamp for synchronized countdown
  winner: TeamType | 'DRAW' | null;
  winnerReason: string | null;
  rooms: RoomId[];
  players: Player[];
  logs: GameLogEntry[];
  chatMessages: ChatMessage[];
  settings: GameSettings;
  createdAt: number;
  updatedAt: number;
  roleMapping?: Record<string, string>; // playerId -> roleId

  // Global Game Metrics
  killerKillCount: number; // 살인마 살인 누적 횟수 (3회 시 살인마 진영 승리)
  wardenTargetPlayerId?: string | null; // 이번 라운드 교도관이 지정한 감옥 대상
  finalVotingVotes?: Record<string, string>; // voterId -> targetPlayerId
  pendingForensicEvents?: { round: number; victimNickname: string; room: RoomLocation }[];
}
