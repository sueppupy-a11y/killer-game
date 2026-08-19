import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Crown, Ghost, MessageCircle, Send, Sparkles } from 'lucide-react';
import { ChatMessage, GameState, Player } from '../types';

interface Props {
  game: GameState;
  me: Player;
  onSend: (message: string) => Promise<void>;
  onGhostWhisper: (message: string) => Promise<void>;
  onRevealMayor: () => Promise<void>;
  busy: boolean;
}

export const DiscussionPanel: React.FC<Props> = ({ game, me, onSend, onGhostWhisper, onRevealMayor, busy }) => {
  const [text, setText] = useState('');
  const [ghostText, setGhostText] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const messages = game.chatMessages.filter((m) => m.round === game.round || m.system).slice(-100);
  const messageMap = useMemo(() => new Map(messages.map((m) => [m.id, m])), [messages]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  const submit = async () => {
    const value = text.trim();
    if (!value || busy || me.status !== 'ALIVE') return;
    setText('');
    await onSend(value);
  };

  const submitGhost = async () => {
    const value = ghostText.trim();
    if (!value || busy || me.status !== 'DEAD' || me.roleId !== 'ghost' || (me.ghostWhispersRemaining || 0) <= 0) return;
    setGhostText('');
    await onGhostWhisper(value);
  };

  const mentionBot = (m: ChatMessage) => {
    if (!m.isBot || me.status !== 'ALIVE') return;
    setText((prev) => prev.trim() ? `${prev.trim()} ${m.nickname} ` : `${m.nickname} `);
  };

  const isGhostPlayer = me.roleId === 'ghost' && me.status === 'DEAD';

  return (
    <div className="space-y-3">
      {me.roleId === 'mayor' && me.status === 'ALIVE' && !me.mayorRevealed && (
        <button onClick={onRevealMayor} disabled={busy} className="w-full p-4 rounded-2xl bg-amber-950/30 border border-amber-700/50 text-left flex items-center justify-between gap-3">
          <div><div className="font-black text-amber-300 flex items-center gap-1.5"><Crown className="w-4 h-4"/> 시장 능력 사용</div><div className="mt-1 text-xs text-zinc-400">정체를 공개하면 이후 내 투표가 2표가 됩니다.</div></div><span className="px-3 py-2 rounded-xl bg-amber-600 text-xs font-black text-white">공개</span>
        </button>
      )}

      {isGhostPlayer && (
        <div className="p-4 rounded-2xl bg-violet-950/35 border border-violet-700/50 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-black text-violet-200 flex items-center gap-1.5"><Ghost className="w-4 h-4"/> 유령 — 저승의 속삭임</div>
              <div className="mt-1 text-xs text-zinc-400">탈락했지만 익명 힌트를 남길 수 있습니다. 누가 보냈는지는 표시되지 않습니다.</div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-violet-900/60 border border-violet-700 text-[11px] font-black text-violet-200">남은 횟수 {me.ghostWhispersRemaining || 0}</span>
          </div>
          {(me.ghostWhispersRemaining || 0) > 0 ? (
            <div className="flex gap-2">
              <input value={ghostText} onChange={(e) => setGhostText(e.target.value.slice(0, 50))} onKeyDown={(e) => e.key === 'Enter' && submitGhost()} placeholder="50자 이내 힌트 한마디" className="flex-1 px-4 py-3 rounded-xl bg-zinc-950 border border-violet-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500"/>
              <button onClick={submitGhost} disabled={!ghostText.trim() || busy} className="px-4 rounded-xl bg-violet-600 disabled:bg-zinc-800 font-black text-sm">속삭이기</button>
            </div>
          ) : <div className="text-xs text-zinc-500">유령의 속삭임을 모두 사용했습니다. 토론은 계속 볼 수 있습니다.</div>}
        </div>
      )}

      <div className="rounded-3xl bg-zinc-900 border border-zinc-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between gap-2">
          <div className="font-black text-sm text-white flex items-center gap-2"><MessageCircle className="w-4 h-4 text-blue-400"/> 실시간 토론</div>
          <div className="text-[10px] text-zinc-500 text-right"><Bot className="w-3.5 h-3.5 inline mr-1"/>BOT은 먼저 말하지 않고 질문받을 때만 답변</div>
        </div>
        <div className="h-[390px] overflow-y-auto p-4 space-y-3 no-scrollbar">
          {messages.length === 0 && <div className="h-full flex items-center justify-center text-xs text-zinc-600">첫 의견을 남겨보세요.</div>}
          {messages.map((m) => {
            const replied = m.replyToMessageId ? messageMap.get(m.replyToMessageId) : undefined;
            if (m.system) return <div key={m.id} className="text-center"><span className="inline-block max-w-[90%] px-3 py-2 rounded-xl bg-zinc-800 text-[11px] text-zinc-400">{m.message}</span></div>;
            if (m.ghost) return (
              <div key={m.id} className="flex justify-center">
                <div className="max-w-[90%] px-4 py-3 rounded-2xl bg-violet-950/60 border border-violet-700/50 text-violet-100 text-sm shadow-lg shadow-violet-950/20">
                  <div className="mb-1 text-[10px] font-black text-violet-300 flex items-center justify-center gap-1"><Ghost className="w-3.5 h-3.5"/> 유령의 속삭임</div>
                  <div className="text-center leading-relaxed">{m.message}</div>
                </div>
              </div>
            );
            return (
              <div key={m.id} className={`flex ${m.playerId === me.id ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[84%] ${m.playerId === me.id ? 'items-end' : 'items-start'} flex flex-col`}>
                  <button type="button" onClick={() => mentionBot(m)} className={`mb-1 px-1 text-[10px] text-zinc-500 flex items-center gap-1 ${m.isBot && me.status === 'ALIVE' ? 'hover:text-amber-300 cursor-pointer' : 'cursor-default'}`}>
                    {m.nickname}{m.isBot && <span className="px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 font-bold">BOT</span>}
                  </button>
                  {replied && (
                    <div className="mb-1 max-w-full px-2.5 py-1.5 rounded-lg bg-zinc-950/80 border border-zinc-800 text-[10px] text-zinc-500 truncate">
                      ↪ {replied.nickname}: {replied.message}
                    </div>
                  )}
                  <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${m.playerId === me.id ? 'bg-blue-600 text-white rounded-br-md' : 'bg-zinc-800 text-zinc-100 rounded-bl-md'}`}>{m.message}</div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef}/>
        </div>
        <div className="p-3 border-t border-zinc-800 bg-zinc-950/60">
          {me.status === 'ALIVE' ? (
            <div className="space-y-2">
              <div className="flex gap-2"><input value={text} onChange={(e) => setText(e.target.value.slice(0, 180))} onKeyDown={(e) => e.key === 'Enter' && submit()} placeholder="예: 민준아 누구 의심해? / 누가 제일 수상해?" className="flex-1 px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-700 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500"/><button onClick={submit} disabled={!text.trim() || busy} className="w-12 rounded-xl bg-blue-600 disabled:bg-zinc-800 flex items-center justify-center"><Send className="w-5 h-5"/></button></div>
              <div className="text-[10px] text-zinc-600">특정 BOT에게 물으려면 BOT 이름을 누른 뒤 질문하세요. 질문이 아니면 BOT은 답하지 않습니다.</div>
            </div>
          ) : (
            <div className="py-2 text-center text-xs text-zinc-500">{isGhostPlayer ? '일반 채팅은 할 수 없지만 위의 유령 힌트는 사용할 수 있습니다.' : '탈락한 플레이어는 채팅을 읽을 수만 있습니다.'}</div>
          )}
        </div>
      </div>

      <div className="p-3 rounded-2xl bg-blue-950/20 border border-blue-900/40 text-xs text-zinc-400 flex items-start gap-2"><Sparkles className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0"/> BOT은 먼저 대화를 시작하지 않습니다. 질문할 때만 BOT 1명이 답하고, 이름을 적으면 그 BOT만 답합니다.</div>
    </div>
  );
};
