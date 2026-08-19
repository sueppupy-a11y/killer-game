import React from 'react';
import { GameLogEntry } from '../types';
import { ScrollText, Skull, Lock, Shield, Sparkles, Info, Trophy } from 'lucide-react';

interface GameLogProps {
  logs: GameLogEntry[];
}

export const GameLog: React.FC<GameLogProps> = ({ logs }) => {
  const getLogIcon = (type: GameLogEntry['type']) => {
    switch (type) {
      case 'death':
        return <Skull className="w-4 h-4 text-red-500" />;
      case 'arrest':
        return <Lock className="w-4 h-4 text-amber-500" />;
      case 'police':
        return <Shield className="w-4 h-4 text-blue-400" />;
      case 'win':
        return <Trophy className="w-4 h-4 text-yellow-400" />;
      case 'phase':
        return <Sparkles className="w-4 h-4 text-red-400" />;
      default:
        return <Info className="w-4 h-4 text-zinc-400" />;
    }
  };

  const getLogBadgeStyle = (type: GameLogEntry['type']) => {
    switch (type) {
      case 'death':
        return 'border-red-900/60 bg-red-950/30 text-red-300';
      case 'arrest':
        return 'border-amber-900/60 bg-amber-950/30 text-amber-300';
      case 'win':
        return 'border-yellow-800/80 bg-yellow-950/40 text-yellow-300';
      case 'phase':
        return 'border-zinc-700 bg-zinc-900 text-zinc-200';
      default:
        return 'border-zinc-800 bg-zinc-900/60 text-zinc-400';
    }
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
          <ScrollText className="w-4 h-4 text-red-500" />
          공개 게임 기록 ({logs.length}건)
        </h3>
        <span className="text-xs text-zinc-500">최신 기록 순</span>
      </div>

      {logs.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-zinc-900/50 border border-zinc-800 text-zinc-500 text-sm">
          아직 기록된 이벤트가 없습니다.
        </div>
      ) : (
        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
          {logs.map((log) => {
            const timeStr = new Date(log.timestamp).toLocaleTimeString('ko-KR', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });

            return (
              <div
                key={log.id}
                className={`p-3.5 rounded-xl border flex items-start gap-3 transition-all ${getLogBadgeStyle(
                  log.type
                )}`}
              >
                <div className="mt-0.5 shrink-0">{getLogIcon(log.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-xs font-mono font-bold text-zinc-400">
                      R{String(log.round).padStart(2, '0')}
                    </span>
                    <span className="text-[11px] font-mono text-zinc-500">{timeStr}</span>
                  </div>
                  <p className="text-xs leading-relaxed text-zinc-200 font-medium break-words">
                    {log.message}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
