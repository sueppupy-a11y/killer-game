import React, { useState } from 'react';
import { CheckCircle2, Crown, Vote } from 'lucide-react';
import { GameState, Player } from '../types';

export const VotePanel: React.FC<{ game: GameState; me: Player; onVote: (targetId: string) => Promise<void>; busy: boolean }> = ({ game, me, onVote, busy }) => {
  const [selected, setSelected] = useState('');
  if (me.status !== 'ALIVE') return <div className="p-7 rounded-3xl bg-zinc-900 border border-zinc-800 text-center"><Vote className="w-8 h-8 text-zinc-500 mx-auto"/><div className="mt-3 font-black text-white">투표 관전 중</div><div className="mt-2 text-sm text-zinc-500">탈락한 플레이어는 투표할 수 없습니다.</div></div>;
  if (game.myVote) {
    const target = game.players.find((p) => p.id === game.myVote?.targetPlayerId);
    return <div className="p-7 rounded-3xl bg-emerald-950/30 border border-emerald-800/50 text-center"><CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto"/><div className="mt-3 font-black text-white">투표 완료</div><div className="mt-1 text-sm text-emerald-300">{target?.nickname}님에게 {game.myVote.weight}표를 투표했습니다.</div><div className="mt-2 text-xs text-zinc-500">모든 생존자의 투표를 기다리는 중...</div></div>;
  }
  const targets = game.players.filter((p) => p.status === 'ALIVE' && p.id !== me.id);
  return (
    <div className="p-5 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-4">
      <div className="text-center"><Vote className="w-8 h-8 text-red-400 mx-auto"/><h2 className="mt-2 text-xl font-black text-white">가장 의심되는 사람은?</h2><p className="mt-1 text-xs text-zinc-400">한 명을 선택하세요. 투표가 끝나면 가장 많은 표를 받은 사람이 탈락합니다.</p>{me.roleId === 'mayor' && me.mayorRevealed && <div className="mt-2 text-xs text-amber-300 font-bold"><Crown className="w-3.5 h-3.5 inline mr-1"/>시장 공개 상태: 내 표는 2표</div>}</div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{targets.map((p) => <button key={p.id} onClick={() => setSelected(p.id)} className={`p-3.5 rounded-2xl border text-left ${selected === p.id ? 'bg-red-950/50 border-red-500 ring-1 ring-red-500/40' : 'bg-zinc-950 border-zinc-800'}`}><div className="font-bold text-sm text-white truncate">{p.nickname}</div><div className="mt-1 text-[10px] text-zinc-500">{p.isBot ? 'BOT' : p.revealedRole && p.role ? `${p.role.emoji} ${p.role.name}` : '생존자'}</div></button>)}</div>
      <button disabled={!selected || busy} onClick={() => selected && onVote(selected)} className="w-full py-4 rounded-2xl bg-red-600 disabled:bg-zinc-800 disabled:text-zinc-600 font-black text-white">이 사람에게 투표</button>
    </div>
  );
};
