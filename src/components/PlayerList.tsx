import React from 'react';
import { Player, GameState } from '../types';
import { User, Skull, Lock, Shield, Check, MapPin, Crown, Bot, Ban } from 'lucide-react';
import { getTeamColor } from '../rolesData';

interface PlayerListProps {
  game: GameState;
  currentUserId: string;
}

export const PlayerList: React.FC<PlayerListProps> = ({ game, currentUserId }) => {
  const alivePlayers = game.players.filter((p) => p.status === 'ALIVE');
  const deadPlayers = game.players.filter((p) => p.status === 'DEAD');
  const removedPlayers = game.players.filter((p) => p.status === 'REMOVED');

  const isGameOver = game.status === 'GAME_OVER';
  const isDiscussion = game.phase === 'RESULT_DISCUSSION';

  return (
    <div className="w-full space-y-6" id="player-list-container">
      {/* Header Summary */}
      <div className="grid grid-cols-3 gap-2 text-center" id="player-stats-bar">
        <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-800/40">
          <div className="text-xs text-emerald-400 font-semibold">생존 (ALIVE)</div>
          <div className="text-xl font-bold font-mono text-white">{alivePlayers.length}명</div>
        </div>
        <div className="p-3 rounded-2xl bg-red-950/30 border border-red-800/40">
          <div className="text-xs text-red-400 font-semibold">사망 (DEAD)</div>
          <div className="text-xl font-bold font-mono text-zinc-300">{deadPlayers.length}명</div>
        </div>
        <div className="p-3 rounded-2xl bg-amber-950/30 border border-amber-800/40">
          <div className="text-xs text-amber-400 font-semibold">제외 (REMOVED)</div>
          <div className="text-xl font-bold font-mono text-zinc-300">{removedPlayers.length}명</div>
        </div>
      </div>

      {/* Alive Group */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            생존자 ({alivePlayers.length}명)
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {alivePlayers.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              isSelf={player.id === currentUserId}
              isGameOver={isGameOver}
              isDiscussion={isDiscussion}
              isSelectionPhase={game.phase === 'ROOM_SELECTION'}
            />
          ))}
        </div>
      </div>

      {/* Dead Group */}
      {deadPlayers.length > 0 && (
        <div className="space-y-3 pt-2">
          <h3 className="text-sm font-bold text-red-400 flex items-center gap-2">
            <Skull className="w-4 h-4 text-red-500" />
            살해된 사망자 ({deadPlayers.length}명)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {deadPlayers.map((player) => (
              <PlayerCard
                key={player.id}
                player={player}
                isSelf={player.id === currentUserId}
                isGameOver={isGameOver}
                isDiscussion={isDiscussion}
                isSelectionPhase={false}
              />
            ))}
          </div>
        </div>
      )}

      {/* Removed Group (Arrested / Mutual Destruction) */}
      {removedPlayers.length > 0 && (
        <div className="space-y-3 pt-2">
          <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
            <Ban className="w-4 h-4 text-amber-500" />
            체포 및 게임 제외자 ({removedPlayers.length}명)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {removedPlayers.map((player) => (
              <PlayerCard
                key={player.id}
                player={player}
                isSelf={player.id === currentUserId}
                isGameOver={isGameOver}
                isDiscussion={isDiscussion}
                isSelectionPhase={false}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

interface PlayerCardProps {
  player: Player;
  isSelf: boolean;
  isGameOver: boolean;
  isDiscussion: boolean;
  isSelectionPhase: boolean;
}

const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  isSelf,
  isGameOver,
  isDiscussion,
  isSelectionPhase,
}) => {
  const role = player.role;
  const style = role ? getTeamColor(role.team) : null;

  return (
    <div
      id={`player-card-${player.id}`}
      className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
        isSelf
          ? 'bg-zinc-900 border-zinc-500 ring-1 ring-zinc-500/50'
          : player.status === 'DEAD'
          ? 'bg-zinc-950/80 border-red-950/80 opacity-70'
          : player.status === 'REMOVED'
          ? 'bg-zinc-950/80 border-amber-950/80 opacity-75'
          : 'bg-zinc-900/60 border-zinc-800/80 hover:border-zinc-700'
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
            player.status === 'DEAD'
              ? 'bg-red-950/80 text-red-400 border border-red-800/50'
              : player.status === 'REMOVED'
              ? 'bg-amber-950/80 text-amber-400 border border-amber-800/50'
              : isSelf
              ? 'bg-zinc-800 text-white border border-zinc-600'
              : 'bg-zinc-850 text-zinc-300 border border-zinc-800'
          }`}
        >
          {player.status === 'DEAD' ? (
            <Skull className="w-5 h-5 text-red-400" />
          ) : player.status === 'REMOVED' ? (
            <Ban className="w-5 h-5 text-amber-400" />
          ) : player.isBot ? (
            <Bot className="w-5 h-5 text-zinc-400" />
          ) : (
            <User className="w-5 h-5 text-zinc-300" />
          )}
        </div>

        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-sm text-white">{player.nickname}</span>
            {player.isHost && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 text-[10px] font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                <Crown className="w-2.5 h-2.5" /> HOST
              </span>
            )}
            {isSelf && (
              <span className="px-1.5 py-0.2 text-[10px] font-bold rounded bg-blue-600 text-white">
                나
              </span>
            )}
          </div>

          {/* If Game Over or Self: show role badge */}
          {(isGameOver || (isSelf && role)) && role && style && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`text-xs font-bold ${style.text}`}>{role.name}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${style.badge}`}>
                {role.teamName}
              </span>
            </div>
          )}

          {/* During game (not game over), other players' roles are strictly confidential */}
          {!isGameOver && !(isSelf && role) && (
            <div className="text-[11px] text-zinc-500 font-medium">비밀 역할 (비공개)</div>
          )}
        </div>
      </div>

      {/* Right Side Status Indicators */}
      <div className="flex items-center gap-2">
        {/* Selection status indicator during selection */}
        {isSelectionPhase && player.status === 'ALIVE' && (
          <span
            className={`px-2 py-0.5 text-xs font-bold rounded-full ${
              player.confirmedRoom
                ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                : 'bg-zinc-800 text-zinc-400'
            }`}
          >
            {player.confirmedRoom ? '방 배정 완료' : '배정 대기'}
          </span>
        )}

        {/* Location badge: ONLY visible for SELF player or at GAME_OVER. Never for other players! */}
        {(isSelf || isGameOver) && player.currentRoom && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-xs font-bold font-mono text-zinc-200">
            <MapPin className="w-3 h-3 text-red-400" />
            {player.currentRoom === 'PRISON' ? 'PRISON (감옥)' : `${player.currentRoom} ROOM`}
          </span>
        )}
      </div>
    </div>
  );
};
