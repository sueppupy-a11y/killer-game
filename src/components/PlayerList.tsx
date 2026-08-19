import React from 'react';
import { Bot, Crown, Heart, Skull, X } from 'lucide-react';
import { GameState } from '../types';

export const PlayerList: React.FC<{ game: GameState; currentUserId: string; onClose: () => void }> = ({ game, currentUserId, onClose }) => (
  <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm p-4 flex items-center justify-center">
    <div className="w-full max-w-md max-h-[82vh] overflow-hidden rounded-3xl bg-zinc-950 border border-zinc-800 shadow-2xl">
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between"><div><div className="font-black text-white">참가자</div><div className="text-xs text-zinc-500">생존 {game.players.filter(p=>p.status==='ALIVE').length} / 12명</div></div><button onClick={onClose} className="p-2 rounded-xl bg-zinc-900 text-zinc-400"><X className="w-4 h-4"/></button></div>
      <div className="p-3 space-y-2 overflow-y-auto max-h-[70vh] no-scrollbar">{game.players.map((p) => <div key={p.id} className={`p-3 rounded-2xl border flex items-center justify-between ${p.status === 'DEAD' ? 'bg-red-950/15 border-red-950 opacity-70' : 'bg-zinc-900 border-zinc-800'}`}><div className="flex items-center gap-3"><div className={`w-9 h-9 rounded-xl flex items-center justify-center ${p.status==='ALIVE'?'bg-emerald-950 text-emerald-400':'bg-red-950 text-red-400'}`}>{p.status==='ALIVE'?<Heart className="w-4 h-4"/>:<Skull className="w-4 h-4"/>}</div><div><div className="font-bold text-sm text-white flex items-center gap-1.5">{p.nickname}{p.id===currentUserId&&<span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-600">나</span>}{p.isHost&&<Crown className="w-3 h-3 text-amber-400"/>}</div><div className="mt-0.5 text-[10px] text-zinc-500 flex items-center gap-1">{p.isBot&&<><Bot className="w-3 h-3"/>BOT · </>}{p.revealedRole && p.role ? `${p.role.emoji} ${p.role.name}` : p.status==='ALIVE'?'역할 비공개':'역할 비공개'}</div></div></div><span className={`text-[10px] font-bold ${p.status==='ALIVE'?'text-emerald-400':'text-red-400'}`}>{p.status==='ALIVE'?'생존':'탈락'}</span></div>)}</div>
    </div>
  </div>
);
