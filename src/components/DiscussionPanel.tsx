import React, { useEffect, useRef, useState } from 'react';
import { Bot, Crown, MessageCircle, Send, Sparkles } from 'lucide-react';
import { GameState, Player } from '../types';

export const DiscussionPanel: React.FC<{ game: GameState; me: Player; onSend: (message: string) => Promise<void>; onRevealMayor: () => Promise<void>; busy: boolean }> = ({ game, me, onSend, onRevealMayor, busy }) => {
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const messages = game.chatMessages.filter((m) => m.round === game.round || m.system).slice(-80);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  const submit = async () => {
    const value = text.trim(); if (!value || busy || me.status !== 'ALIVE') return;
    setText(''); await onSend(value);
  };

  return (
    <div className="space-y-3">
      {me.roleId === 'mayor' && me.status === 'ALIVE' && !me.mayorRevealed && (
        <button onClick={onRevealMayor} disabled={busy} className="w-full p-4 rounded-2xl bg-amber-950/30 border border-amber-700/50 text-left flex items-center justify-between gap-3">
          <div><div className="font-black text-amber-300 flex items-center gap-1.5"><Crown className="w-4 h-4"/> 시장 능력 사용</div><div className="mt-1 text-xs text-zinc-400">정체를 공개하면 이후 내 투표가 2표가 됩니다.</div></div><span className="px-3 py-2 rounded-xl bg-amber-600 text-xs font-black text-white">공개</span>
        </button>
      )}

      <div className="rounded-3xl bg-zinc-900 border border-zinc-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between"><div className="font-black text-sm text-white flex items-center gap-2"><MessageCircle className="w-4 h-4 text-blue-400"/> 실시간 토론</div><div className="text-[10px] text-zinc-500"><Bot className="w-3.5 h-3.5 inline mr-1"/>BOT도 추리에 참여합니다</div></div>
        <div className="h-[390px] overflow-y-auto p-4 space-y-3 no-scrollbar">
          {messages.length === 0 && <div className="h-full flex items-center justify-center text-xs text-zinc-600">첫 의견을 남겨보세요.</div>}
          {messages.map((m) => m.system ? (
            <div key={m.id} className="text-center"><span className="inline-block max-w-[90%] px-3 py-2 rounded-xl bg-zinc-800 text-[11px] text-zinc-400">{m.message}</span></div>
          ) : (
            <div key={m.id} className={`flex ${m.playerId === me.id ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[82%] ${m.playerId === me.id ? 'items-end' : 'items-start'} flex flex-col`}>
                <div className="mb-1 px-1 text-[10px] text-zinc-500 flex items-center gap-1">{m.nickname}{m.isBot && <span className="px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 font-bold">BOT</span>}</div>
                <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${m.playerId === me.id ? 'bg-blue-600 text-white rounded-br-md' : 'bg-zinc-800 text-zinc-100 rounded-bl-md'}`}>{m.message}</div>
              </div>
            </div>
          ))}
          <div ref={bottomRef}/>
        </div>
        <div className="p-3 border-t border-zinc-800 bg-zinc-950/60">
          {me.status === 'ALIVE' ? <div className="flex gap-2"><input value={text} onChange={(e) => setText(e.target.value.slice(0, 180))} onKeyDown={(e) => e.key === 'Enter' && submit()} placeholder="의심되는 점, 정보, 질문을 입력하세요" className="flex-1 px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-700 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500"/><button onClick={submit} disabled={!text.trim() || busy} className="w-12 rounded-xl bg-blue-600 disabled:bg-zinc-800 flex items-center justify-center"><Send className="w-5 h-5"/></button></div> : <div className="py-2 text-center text-xs text-zinc-500">탈락한 플레이어는 채팅을 읽을 수만 있습니다.</div>}
        </div>
      </div>

      <div className="p-3 rounded-2xl bg-blue-950/20 border border-blue-900/40 text-xs text-zinc-400 flex items-start gap-2"><Sparkles className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0"/> 경찰·탐정 같은 정보직은 정체를 바로 밝히기보다 결과를 힌트처럼 공유해도 됩니다.</div>
    </div>
  );
};
