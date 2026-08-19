import React from 'react';
import { AlertTriangle, CheckCircle2, Search, Skull, Sun, Vote } from 'lucide-react';
import { GameState, Player } from '../types';

export const MorningPanel: React.FC<{ game: GameState; me: Player }> = ({ game, me }) => {
  const r = game.lastNightResult;
  const clues = me.privateClues.filter((c) => c.round === game.round).slice().reverse();
  return <div className="space-y-4">
    <div className="p-7 rounded-3xl bg-gradient-to-b from-amber-950/30 to-zinc-900 border border-amber-900/40 text-center">
      <Sun className="w-9 h-9 text-amber-400 mx-auto"/><div className="mt-3 text-xs font-black tracking-[0.18em] text-amber-500">MORNING</div><h2 className="mt-1 text-xl font-black text-white">{r?.message || '아침이 되었습니다.'}</h2>
      {r?.deaths?.map((d) => <div key={d.playerId} className="mt-3 inline-flex mx-1 px-3 py-2 rounded-xl bg-red-950/50 border border-red-900/50 text-sm text-red-200"><Skull className="w-4 h-4 mr-1.5"/>{d.nickname}{d.roleName ? ` · ${d.roleName}` : ''}</div>)}
      {r && r.deaths.length === 0 && <div className="mt-3 text-sm text-emerald-300 flex items-center justify-center gap-1"><CheckCircle2 className="w-4 h-4"/>아무도 사망하지 않았습니다.</div>}
    </div>
    {clues.length > 0 && <div className="p-5 rounded-3xl bg-blue-950/25 border border-blue-800/50 space-y-3"><div className="font-black text-blue-300 flex items-center gap-2"><Search className="w-4 h-4"/> 나에게만 보이는 정보</div>{clues.map((c) => <div key={c.id} className="p-3 rounded-xl bg-zinc-950 border border-zinc-800"><div className="text-[10px] font-bold text-zinc-500">{c.source}</div><div className="mt-1 text-sm text-zinc-100">{c.text}</div></div>)}</div>}
  </div>;
};

export const ExecutionPanel: React.FC<{ game: GameState }> = ({ game }) => {
  const r = game.lastExecutionResult;
  if (!r) return null;
  return <div className="space-y-4">
    <div className="p-7 rounded-3xl bg-zinc-900 border border-zinc-800 text-center"><Vote className="w-9 h-9 text-red-400 mx-auto"/><div className="mt-3 text-xs font-black tracking-[0.18em] text-zinc-500">VOTE RESULT</div><h2 className="mt-2 text-xl font-black text-white leading-relaxed">{r.message}</h2></div>
    <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800"><div className="text-xs font-black text-zinc-400 mb-3">투표 내역</div><div className="space-y-1.5">{r.breakdown.map((v, i) => <div key={i} className="flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-950 text-xs"><span className="text-zinc-300">{v.voterNickname}</span><span className="text-zinc-600">→</span><span className="text-white font-bold">{v.targetNickname} {v.weight === 2 && <b className="text-amber-400">×2표</b>}</span></div>)}</div></div>
    <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-500 text-center"><AlertTriangle className="w-3.5 h-3.5 inline mr-1"/>잠시 후 자동으로 다음 밤으로 넘어갑니다.</div>
  </div>;
};
