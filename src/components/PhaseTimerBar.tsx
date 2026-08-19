import React, { useEffect, useState } from 'react';
import { GameState } from '../types';
import { MessageSquare, MapPin, FastForward, Zap, Sun } from 'lucide-react';

interface PhaseTimerBarProps {
  game: GameState;
  isHost: boolean;
  onSkipDiscussion: () => Promise<void>;
  isSubmitting: boolean;
}

export const PhaseTimerBar: React.FC<PhaseTimerBarProps> = ({
  game,
  isHost,
  onSkipDiscussion,
  isSubmitting,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!game.phaseExpiresAt || game.status !== 'PLAYING') {
      setSecondsRemaining(null);
      return;
    }

    const updateTimer = () => {
      const remainingMs = game.phaseExpiresAt! - Date.now();
      setSecondsRemaining(Math.max(0, Math.ceil(remainingMs / 1000)));
    };

    updateTimer();
    const timer = setInterval(updateTimer, 200);
    return () => clearInterval(timer);
  }, [game.phaseExpiresAt, game.status, game.phase]);

  if (game.status !== 'PLAYING') return null;

  const isDiscussion = game.phase === 'PRE_SELECTION_DISCUSSION';
  const isRoom = game.phase === 'ROOM_SELECTION' || game.phase === 'ROOM_DRAW';
  const isAbility = game.phase === 'ABILITY_ACTION';
  const isDay = game.phase === 'DAY';

  const totalTime = isDiscussion
    ? game.settings.preDiscussionTimeSeconds || 60
    : isRoom
    ? game.settings.roomSelectionTimeSeconds || 15
    : isAbility
    ? game.settings.abilityActionTimeSeconds || 15
    : isDay
    ? game.settings.dayResultTimeSeconds || 8
    : 0;

  const remaining = secondsRemaining ?? totalTime;
  const progress = totalTime > 0 ? Math.min(100, Math.max(0, (remaining / totalTime) * 100)) : 0;
  const urgent = (isRoom || isAbility) && remaining <= 5;

  const title = isDiscussion
    ? '자유 대화'
    : isRoom
    ? '방 선택'
    : isAbility
    ? '특수능력 선택'
    : isDay
    ? '낮 · 결과 발표'
    : '게임 진행';

  const description = isDiscussion
    ? '대화 시간이 끝나면 자동으로 방 선택으로 이동합니다.'
    : isRoom
    ? '랜덤 후보 2개 중 한 방을 선택하고 확정하세요.'
    : isAbility
    ? '사용형 직업은 지금 능력을 실행하세요. 미사용도 가능합니다.'
    : isDay
    ? '이번 라운드 결과를 확인하세요. 곧 다음 라운드가 자동 시작됩니다.'
    : '게임 진행 중';

  const Icon = isDiscussion ? MessageSquare : isRoom ? MapPin : isAbility ? Zap : Sun;

  return (
    <div
      className={`p-4 rounded-2xl border shadow-xl overflow-hidden ${
        urgent
          ? 'bg-red-950/80 border-red-500 ring-2 ring-red-500/70'
          : isAbility
          ? 'bg-yellow-950/30 border-yellow-700/60'
          : isDay
          ? 'bg-amber-950/30 border-amber-700/60'
          : isRoom
          ? 'bg-red-950/40 border-red-900/60'
          : 'bg-zinc-900 border-zinc-800'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-700 flex-shrink-0">
            <Icon className={`w-5 h-5 ${isAbility ? 'text-yellow-400' : isDay ? 'text-amber-400' : isRoom ? 'text-red-400' : 'text-blue-400'}`} />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-mono uppercase font-bold text-zinc-400">
              ROUND {String(game.round).padStart(2, '0')} · {title}
            </div>
            <div className="text-sm sm:text-base font-black text-white truncate">{description}</div>
          </div>
        </div>

        {secondsRemaining !== null && totalTime > 0 && (
          <div className="text-right flex-shrink-0">
            <div className={`font-mono font-black text-2xl sm:text-3xl ${urgent ? 'text-red-400' : isAbility ? 'text-yellow-400' : isDay ? 'text-amber-400' : isRoom ? 'text-red-400' : 'text-blue-400'}`}>
              {String(Math.floor(remaining / 60)).padStart(2, '0')}:{String(remaining % 60).padStart(2, '0')}
            </div>
            <div className="text-[10px] text-zinc-500 font-bold">
              {isDay ? '다음 라운드까지' : '남은 시간'}
            </div>
          </div>
        )}
      </div>

      {totalTime > 0 && (
        <div className="mt-3 h-2 rounded-full bg-zinc-800 overflow-hidden border border-zinc-700/50">
          <div
            className={`h-full transition-all duration-300 ${isAbility ? 'bg-yellow-500' : isDay ? 'bg-amber-500' : isRoom ? 'bg-red-500' : 'bg-blue-500'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {isDiscussion && isHost && (
        <div className="mt-3 pt-3 border-t border-zinc-800 flex justify-end">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onSkipDiscussion}
            className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-bold text-white flex items-center gap-1.5 disabled:opacity-50"
          >
            <FastForward className="w-3.5 h-3.5 text-yellow-400" />
            바로 방 선택으로
          </button>
        </div>
      )}
    </div>
  );
};
