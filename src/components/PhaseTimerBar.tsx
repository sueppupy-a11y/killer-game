import React, { useState, useEffect } from 'react';
import { GameState, GamePhase } from '../types';
import { Clock, MessageSquare, MapPin, FastForward, Sparkles, AlertTriangle } from 'lucide-react';

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
      const secs = Math.max(0, Math.ceil(remainingMs / 1000));
      setSecondsRemaining(secs);
    };

    updateTimer();
    const timerInterval = setInterval(updateTimer, 200);

    return () => clearInterval(timerInterval);
  }, [game.phaseExpiresAt, game.status, game.phase]);

  if (game.status !== 'PLAYING') return null;

  const isPreDiscussion = game.phase === 'PRE_SELECTION_DISCUSSION';
  const isRoomSelection = game.phase === 'ROOM_SELECTION';
  const isResultDiscussion = game.phase === 'RESULT_DISCUSSION';

  const totalTime = isPreDiscussion
    ? game.settings.preDiscussionTimeSeconds || 60
    : isRoomSelection
    ? game.settings.roomSelectionTimeSeconds || 15
    : 0;

  const remaining = secondsRemaining !== null ? secondsRemaining : totalTime;
  const progressPercent = totalTime > 0 ? Math.min(100, Math.max(0, (remaining / totalTime) * 100)) : 0;
  const isUrgent = isRoomSelection && remaining <= 5;

  return (
    <div
      className={`p-4 rounded-2xl border transition-all duration-300 shadow-xl overflow-hidden relative ${
        isUrgent
          ? 'bg-red-950/80 border-red-500 ring-2 ring-red-500 animate-pulse'
          : isPreDiscussion
          ? 'bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border-zinc-700/80'
          : isRoomSelection
          ? 'bg-gradient-to-r from-red-950/50 via-zinc-900 to-zinc-950 border-red-900/60'
          : 'bg-zinc-900 border-zinc-800'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Phase Header */}
        <div className="flex items-center gap-2.5">
          <div
            className={`p-2.5 rounded-xl ${
              isPreDiscussion
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : isRoomSelection
                ? 'bg-red-600/20 text-red-400 border border-red-500/30'
                : 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
            }`}
          >
            {isPreDiscussion ? (
              <MessageSquare className="w-5 h-5" />
            ) : isRoomSelection ? (
              <MapPin className="w-5 h-5" />
            ) : (
              <Sparkles className="w-5 h-5" />
            )}
          </div>

          <div>
            <div className="text-[11px] font-mono uppercase font-bold text-zinc-400">
              {isPreDiscussion ? '대화 및 전략 회의 단계' : isRoomSelection ? '비밀 방 선택 단계' : '결과 확인 및 자유 토론'}
            </div>
            <div className="text-sm sm:text-base font-black text-white flex items-center gap-1.5">
              {isPreDiscussion && '플레이어 간 자유 대화 진행 중'}
              {isRoomSelection && '15초 내에 이동할 방을 선택하세요!'}
              {isResultDiscussion && '방 이동 완료 및 사건 추리'}
            </div>
          </div>
        </div>

        {/* Big Countdown Display */}
        {secondsRemaining !== null && (isPreDiscussion || isRoomSelection) && (
          <div className="text-right flex-shrink-0">
            <div
              className={`font-mono font-black text-2xl sm:text-3xl tracking-tight leading-none ${
                isUrgent
                  ? 'text-red-400 animate-ping duration-1000'
                  : isRoomSelection
                  ? 'text-red-400'
                  : 'text-amber-400'
              }`}
            >
              {String(Math.floor(remaining / 60)).padStart(2, '0')}:
              {String(remaining % 60).padStart(2, '0')}
            </div>
            <div className="text-[10px] text-zinc-400 font-bold uppercase mt-0.5">
              {isRoomSelection ? '선택 마감까지' : '남은 대화 시간'}
            </div>
          </div>
        )}
      </div>

      {/* Synchronized Progress Bar */}
      {(isPreDiscussion || isRoomSelection) && (
        <div className="mt-3 w-full bg-zinc-800/80 rounded-full h-2 overflow-hidden border border-zinc-700/50">
          <div
            className={`h-full transition-all duration-300 rounded-full ${
              isUrgent ? 'bg-red-500' : isRoomSelection ? 'bg-red-500' : 'bg-amber-500'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* Skip button for Host during 60s pre-discussion */}
      {isPreDiscussion && (
        <div className="mt-3 pt-2.5 border-t border-zinc-800 flex items-center justify-between text-xs">
          <span className="text-zinc-400">
            충분히 대화를 나누셨다면 바로 방 선택으로 넘어갈 수 있습니다.
          </span>
          {isHost ? (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onSkipDiscussion}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-zinc-200 hover:text-white font-bold transition-all inline-flex items-center gap-1 cursor-pointer flex-shrink-0"
            >
              <FastForward className="w-3.5 h-3.5 text-yellow-400" />
              대화 건너뛰기
            </button>
          ) : (
            <span className="text-zinc-500 text-[11px]">(방장이 대화를 건너뛸 수 있음)</span>
          )}
        </div>
      )}
    </div>
  );
};
