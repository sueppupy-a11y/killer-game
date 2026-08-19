import React from 'react';
import { Moon, Sun, MessagesSquare, Vote, X } from 'lucide-react';
import { ROLES } from '../rolesData';

export const RulesModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm p-4 flex items-center justify-center">
    <div className="w-full max-w-lg max-h-[88vh] overflow-hidden rounded-3xl bg-zinc-950 border border-zinc-800 shadow-2xl">
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between"><div className="font-black text-white">게임 방법</div><button onClick={onClose} className="p-2 rounded-xl bg-zinc-900 text-zinc-400"><X className="w-4 h-4"/></button></div>
      <div className="p-5 overflow-y-auto max-h-[78vh] no-scrollbar space-y-5">
        <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800"><div className="font-black text-white">이것만 기억하면 됩니다</div><div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold"><span className="px-2.5 py-1.5 rounded-lg bg-indigo-950 text-indigo-300"><Moon className="w-3 h-3 inline mr-1"/>밤: 능력</span><span>→</span><span className="px-2.5 py-1.5 rounded-lg bg-amber-950 text-amber-300"><Sun className="w-3 h-3 inline mr-1"/>아침: 결과</span><span>→</span><span className="px-2.5 py-1.5 rounded-lg bg-blue-950 text-blue-300"><MessagesSquare className="w-3 h-3 inline mr-1"/>대화</span><span>→</span><span className="px-2.5 py-1.5 rounded-lg bg-red-950 text-red-300"><Vote className="w-3 h-3 inline mr-1"/>투표</span></div><p className="mt-3 text-xs text-zinc-400">화면에 뜨는 행동만 하면 자동으로 다음 단계로 넘어갑니다.</p></div>
        <div><h3 className="text-sm font-black text-red-300 mb-2">살인마 진영 3명</h3><div className="space-y-2">{(['killer','spy','accomplice'] as const).map((id)=><RoleRow key={id} id={id}/>)}</div></div>
        <div><h3 className="text-sm font-black text-blue-300 mb-2">시민 진영 9명</h3><div className="space-y-2">{(['police','doctor','bodyguard','detective','psychic','mayor','citizen'] as const).map((id)=><RoleRow key={id} id={id} suffix={id==='citizen'?' ×3':''}/>)}</div></div>
        <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 space-y-2"><div><b className="text-white">시민 승리:</b> 살인마 진영을 모두 탈락시키기</div><div><b className="text-white">살인마 승리:</b> 생존 살인마 진영 수가 시민 진영 수와 같거나 많아지기</div></div>
      </div>
    </div>
  </div>
);

const RoleRow: React.FC<{ id: keyof typeof ROLES; suffix?: string }> = ({ id, suffix='' }) => { const r=ROLES[id]; return <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800"><div className="text-sm font-bold text-white">{r.emoji} {r.name}{suffix}</div><div className="mt-1 text-xs text-zinc-400">{r.abilityDescription}</div></div>; };
