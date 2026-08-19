export type TeamType = 'citizen' | 'killer';
export type PlayerStatus = 'ALIVE' | 'DEAD';
export type GameStatus = 'LOBBY' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';
export type GamePhase = 'ROLE_REVEAL' | 'NIGHT' | 'MORNING' | 'DISCUSSION' | 'VOTE' | 'EXECUTION';
export type BotDifficulty = 'EASY' | 'NORMAL' | 'HARD';

export type RoleId =
  | 'killer'
  | 'spy'
  | 'accomplice'
  | 'police'
  | 'doctor'
  | 'bodyguard'
  | 'detective'
  | 'psychic'
  | 'mayor'
  | 'citizen';

export type NightActionType =
  | 'KILL'
  | 'SPY_SCAN'
  | 'BLOCK'
  | 'POLICE_CHECK'
  | 'HEAL'
  | 'GUARD'
  | 'TRACK'
  | 'SENSE';

export interface RoleDefinition {
  id: RoleId;
  name: string;
  emoji: string;
  team: TeamType;
  teamName: string;
  shortDescription: string;
  abilityName: string;
  abilityDescription: string;
  actionTiming: 'night' | 'day' | 'passive' | 'none';
}

export interface PrivateClue {
  id: string;
  round: number;
  source: string;
  text: string;
  targetPlayerId?: string;
  resultCode?: string;
  createdAt: number;
}

export interface BotBrain {
  suspicion: Record<string, number>;
  lastChatAt: number;
  nextChatAt: number;
  nextActionAt: number;
  discussionChatCount: number;
  lastProcessedChatAt: number;
  roleClaims: Record<string, RoleId>;
  sharedClueIds: string[];
}

export interface Player {
  id: string;
  nickname: string;
  isHost: boolean;
  isBot?: boolean;
  status: PlayerStatus;
  joinedAt: number;
  roleId?: RoleId;
  role?: RoleDefinition;
  revealedRole?: boolean;
  mayorRevealed?: boolean;
  privateClues: PrivateClue[];
  botBrain?: BotBrain;
}

export interface NightAction {
  actorId: string;
  type: NightActionType;
  targetPlayerId: string;
  submittedAt: number;
  auto?: boolean;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  nickname: string;
  message: string;
  timestamp: number;
  round: number;
  isBot?: boolean;
  system?: boolean;
}

export interface GameEvent {
  id: string;
  round: number;
  phase: GamePhase;
  title: string;
  body: string;
  type: 'info' | 'death' | 'vote' | 'ability' | 'win';
  timestamp: number;
}

export interface VoteEntry {
  voterId: string;
  targetPlayerId: string;
  weight: number;
  submittedAt: number;
  auto?: boolean;
}

export interface VoteBreakdownItem {
  voterNickname: string;
  targetNickname: string;
  weight: number;
}

export interface NightResult {
  round: number;
  deaths: Array<{ playerId: string; nickname: string; roleName?: string }>;
  prevented: boolean;
  message: string;
}

export interface ExecutionResult {
  round: number;
  eliminated?: { playerId: string; nickname: string; roleName?: string };
  tied: boolean;
  message: string;
  breakdown: VoteBreakdownItem[];
}

export interface GameSettings {
  botDifficulty: BotDifficulty;
  roleRevealOnDeath: boolean;
  roleRevealSeconds: number;
  nightSeconds: number;
  morningSeconds: number;
  discussionSeconds: number;
  voteSeconds: number;
  executionSeconds: number;
  autoStartDelaySeconds: number;
}

export interface GameState {
  gameId: string;
  hostId: string;
  status: GameStatus;
  round: number;
  phase: GamePhase;
  phaseExpiresAt: number | null;
  lobbyAutoStartAt: number | null;
  winner: TeamType | null;
  winnerReason: string | null;
  players: Player[];
  chatMessages: ChatMessage[];
  events: GameEvent[];
  settings: GameSettings;
  createdAt: number;
  updatedAt: number;
  nightActions: Record<string, NightAction>;
  votes: Record<string, VoteEntry>;
  myNightAction?: NightAction | null;
  myVote?: VoteEntry | null;
  requiredNightAction?: NightActionType | null;
  lastNightResult: NightResult | null;
  lastExecutionResult: ExecutionResult | null;
  pendingWinner?: TeamType | null;
  pendingWinnerReason?: string | null;
}
