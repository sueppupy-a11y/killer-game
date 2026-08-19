import React from 'react';
import { Eye, Shield, Skull, X } from 'lucide-react';
import { GameState, Player } from '../types';

export const RoleCard: React.FC<{ game: GameState; player: Player; onClose?: () => void; full?: boolean }> = ({ game, player, onClose, full = true }) => {
  const role = player.role;
  if (!role) return null;
  const teammates = role.team === 'killer' ? game.players.filter((p) => p.id !== player.id && p.role?.team === 'killer') : [];
  return (
    <div className={`relative overflow-hidden rounded-3xl border p-6 ${role.team === 'killer' ? 'bg-gradient-to-b from-red-950/80 to-zinc-950 border-red-800/60' : 'bg-gradient-to-b from-blue-950/50 to-zinc-950 border-blue-800/50'}`}>
      {onClose && <button onClick={onClose} className="absolute right-4 top-4 p-2 rounded-xl bg-black/20 text-zinc-400"><X className="w-4 h-4"/></button>}
      <div className="text-center">
        <div className="text-5xl">{role.emoji}</div>
        <div className="mt-3 text-xs font-black tracking-[0.2em] text-zinc-500">MY ROLE</div>
        <h2 className="mt-1 text-3xl font-black text-white">{role.name}</h2>
        <div className={`mt-2 inline-flex px-3 py-1 rounded-full text-xs font-bold ${role.team === 'killer' ? 'bg-red-600/20 text-red-300' : 'bg-blue-600/20 text-blue-300'}`}>{role.teamName}</div>
      </div>
      <div className="mt-5 p-4 rounded-2xl bg-black/25 border border-white/5">
        <div className="text-sm font-black text-white">{role.abilityName}</div>
        <p className="mt-1 text-xs leading-relaxed text-zinc-300">{role.abilityDescription}</p>
      </div>
      {full && <p className="mt-4 text-xs text-zinc-400 leading-relaxed">{role.shortDescription}</p>}
      {teammates.length > 0 && (
        <div className="mt-4 p-4 rounded-2xl bg-red-950/40 border border-red-900/50">
          <div className="text-xs font-black text-red-300 flex items-center gap-1.5"><Skull className="w-3.5 h-3.5"/> 같은 살인마 진영</div>
          <div className="mt-2 flex flex-wrap gap-2">{teammates.map((p) => <span key={p.id} className="px-2.5 py-1 rounded-lg bg-zinc-950 text-xs text-zinc-200">{p.nickname} · {p.role?.name}</span>)}</div>
        </div>
      )}
      <div className="mt-4 flex items-start gap-2 text-[11px] text-zinc-500"><Eye className="w-3.5 h-3.5 mt-0.5 flex-shrink-0"/> 다른 사람에게 이 화면을 보여주지 마세요.</div>
    </div>
  );
};
