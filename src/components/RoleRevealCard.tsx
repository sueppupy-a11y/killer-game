import React, { useState, useEffect } from 'react';
import { Shield, Skull, Eye, CheckCircle2, Lock, EyeOff, Sparkles } from 'lucide-react';
import { RoleDefinition } from '../types';
import { getTeamColor } from '../rolesData';

interface InitialRoleModalProps {
  role?: RoleDefinition;
  isOpen: boolean;
  onConfirm: () => void;
}

export const InitialRoleModal: React.FC<InitialRoleModalProps> = ({ role, isOpen, onConfirm }) => {
  if (!isOpen || !role) return null;

  const style = getTeamColor(role.team);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-zinc-950 border-2 border-red-600/80 rounded-3xl p-6 sm:p-8 shadow-2xl text-center overflow-hidden">
        {/* Ambient glow */}
        <div
          className="absolute -top-24 -left-24 w-48 h-48 rounded-full blur-3xl opacity-30 pointer-events-none"
          style={{ backgroundColor: style.accent }}
        />

        <div className="relative z-10 space-y-6">
          <div className="space-y-1">
            <span className="text-xs uppercase tracking-widest text-zinc-400 font-semibold">
              비밀 임무 전달
            </span>
            <h2 className="text-xl font-bold text-zinc-300">당신의 역할</h2>
          </div>

          {/* Big Role Display */}
          <div className={`py-6 px-4 rounded-2xl border ${style.border} ${style.bg} space-y-3`}>
            <div className="inline-flex p-3 rounded-2xl bg-zinc-900/90 border border-zinc-700/60 shadow-inner">
              {role.team === 'citizen' ? (
                <Shield className="w-10 h-10 text-blue-400" />
              ) : role.team === 'killer' ? (
                <Skull className="w-10 h-10 text-red-500" />
              ) : (
                <Eye className="w-10 h-10 text-purple-400" />
              )}
            </div>

            <div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">{role.name}</h1>
              <span className={`inline-block mt-1 px-3 py-0.5 text-xs font-bold rounded-full ${style.badge}`}>
                {role.teamName}
              </span>
            </div>

            <p className="text-xs text-zinc-300 italic pt-1">"{role.tagline}"</p>
          </div>

          {/* Win condition and info */}
          <div className="text-left space-y-3 p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 text-xs">
            <div>
              <div className="text-zinc-400 font-semibold mb-1">🎯 진영 승리 목표</div>
              <div className="text-zinc-200 leading-relaxed font-medium">{role.winCondition}</div>
            </div>

            <div>
              <div className="text-zinc-400 font-semibold mb-1">📋 역할 설명</div>
              <div className="text-zinc-300 leading-relaxed">{role.description}</div>
            </div>

            {role.abilityName && (
              <div className="pt-2 border-t border-zinc-800">
                <div className="text-zinc-400 font-semibold mb-0.5 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                  특수 행동: <span className="text-white font-bold">{role.abilityName}</span>
                </div>
                <div className="text-zinc-300">{role.abilityDescription}</div>
              </div>
            )}
          </div>

          <div className="p-2.5 rounded-lg bg-red-950/30 border border-red-900/40 text-xs text-red-300 font-medium">
            ⚠️ 주의: 본인 외 다른 사람에게 화면이 보이지 않도록 주의하세요.
          </div>

          {/* Confirm Button */}
          <button
            onClick={onConfirm}
            className="w-full py-4 rounded-xl bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white font-bold text-base shadow-lg shadow-red-950/50 transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5" />
            역할 확인 완료
          </button>
        </div>
      </div>
    </div>
  );
};

// In-Game Press-and-Hold Reveal Component
interface HoldToRevealRoleProps {
  role?: RoleDefinition;
}

export const HoldToRevealRole: React.FC<HoldToRevealRoleProps> = ({ role }) => {
  const [isRevealed, setIsRevealed] = useState(false);

  const handleStart = () => setIsRevealed(true);
  const handleEnd = () => setIsRevealed(false);

  if (!role) {
    return (
      <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-center text-zinc-400 text-sm">
        역할 정보가 배정되지 않았습니다.
      </div>
    );
  }

  const style = getTeamColor(role.team);

  return (
    <div className="relative w-full">
      {/* Hold Button */}
      <button
        type="button"
        onMouseDown={handleStart}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchEnd={handleEnd}
        onTouchCancel={handleEnd}
        className={`w-full select-none py-4 px-6 rounded-2xl border transition-all flex items-center justify-center gap-3 font-bold text-base shadow-lg cursor-pointer ${
          isRevealed
            ? 'bg-zinc-800 border-zinc-600 text-white scale-[0.99]'
            : 'bg-gradient-to-b from-zinc-900 to-zinc-950 border-zinc-700/80 hover:border-zinc-500 text-zinc-200 active:scale-[0.98]'
        }`}
      >
        {isRevealed ? (
          <>
            <Eye className="w-5 h-5 text-red-400 animate-pulse" />
            <span>역할 확인 중... (손을 떼면 숨김)</span>
          </>
        ) : (
          <>
            <Lock className="w-5 h-5 text-red-500" />
            <span>내 역할 보기 (길게 누르기)</span>
          </>
        )}
      </button>

      {/* Secret Card Overlay while holding */}
      {isRevealed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-fadeIn select-none pointer-events-none">
          <div className="w-full max-w-sm bg-zinc-950 border-2 border-red-500 rounded-3xl p-6 shadow-2xl text-center space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-950/60 border border-red-800/80 text-xs font-bold text-red-400">
              <EyeOff className="w-3.5 h-3.5" />
              보안 모드 (손을 떼면 즉시 닫힘)
            </div>

            <div className={`p-5 rounded-2xl border ${style.border} ${style.bg} space-y-2`}>
              <div className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">당신의 역할</div>
              <h1 className="text-3xl font-black text-white">{role.name}</h1>
              <span className={`inline-block px-3 py-0.5 text-xs font-bold rounded-full ${style.badge}`}>
                {role.teamName}
              </span>
              <p className="text-xs text-zinc-300 italic pt-1">"{role.tagline}"</p>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-left text-xs space-y-2">
              <div>
                <span className="text-zinc-400 font-semibold">🎯 승리 목표: </span>
                <span className="text-zinc-200">{role.winCondition}</span>
              </div>
              {role.abilityName && (
                <div>
                  <span className="text-zinc-400 font-semibold">⚡ 특수 행동: </span>
                  <span className="text-zinc-200">{role.abilityName} ({role.abilityDescription})</span>
                </div>
              )}
            </div>

            <p className="text-xs text-zinc-400">화면에서 손을 떼면 카드가 즉시 숨겨집니다.</p>
          </div>
        </div>
      )}
    </div>
  );
};
