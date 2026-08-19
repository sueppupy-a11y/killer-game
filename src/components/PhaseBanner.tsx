import React, { useEffect, useState } from 'react';
import { Clock3, Moon, Sun, MessagesSquare, Vote, Skull, BadgeInfo } from 'lucide-react';
import { GamePhase, GameState } from '../types';

const META: Record<GamePhase, { title: string; sub: string; icon: React.ReactNode }> = {
  ROLE_REVEAL: { title: '역할 확인', sub: '내 역할을 확인하세요', icon: <BadgeInfo className="w-5 h-5"/> },
  NIGHT: { title: '밤', sub: '능력이 있다면 대상을 선택하세요', icon: <Moon className="w-5 h-5"/> },
  MORNING: { title: '아침 결과', sub: '지난밤 결과를 확인하세요', icon: <Sun className="w-5 h-5"/> },
  DISCUSSION: { title: '낮 토론', sub: '대화하며 살인마를 추리하세요', icon: <MessagesSquare className="w-5 h-5"/> },
  VOTE: { title: '투표', sub: '가장 의심되는 사람을 선택하세요', icon: <Vote className="w-5 h-5"/> },
  EXECUTION: { title: '투표 결과', sub: '탈락 결과를 확인하세요', icon: <Skull className="w-5 h-5"/> },
};

export const PhaseBanner: React.FC<{ game: GameState }> = ({ game }) => {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    const update = () => setRemaining(game.phaseExpiresAt ? Math.max(0, Math.ceil((game.phaseExpiresAt - Date.now()) / 1000)) : 0);
    update(); const t = setInterval(update, 250); return () => clearInterval(t);
  }, [game.phaseExpiresAt]);
  const meta = META[game.phase];
  const urgent = remaining <= 5 && remaining > 0;
  return (
    <div className={`p-4 rounded-2xl border shadow-xl ${urgent ? 'bg-red-950/60 border-red-600' : 'bg-zinc-900/90 border-zinc-800'}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${game.phase === 'NIGHT' ? 'bg-indigo-950 text-indigo-300' : game.phase === 'DISCUSSION' ? 'bg-blue-950 text-blue-300' : 'bg-zinc-800 text-zinc-200'}`}>{meta.icon}</div>
          <div>
            <div className="text-[10px] font-black tracking-[0.18em] text-zinc-500">ROUND {game.round || 1}</div>
            <div className="font-black text-white">{meta.title}</div>
            <div className="text-[11px] text-zinc-400">{meta.sub}</div>
          </div>
        </div>
        {game.phaseExpiresAt && <div className={`font-mono text-2xl font-black flex items-center gap-1 ${urgent ? 'text-red-400' : 'text-amber-400'}`}><Clock3 className="w-4 h-4"/>{remaining}s</div>}
      </div>
    </div>
  );
};
