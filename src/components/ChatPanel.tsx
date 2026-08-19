import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GameState, Player } from '../types';
import { MessageCircle, Send, Lock, Radio } from 'lucide-react';

interface ChatPanelProps {
  game: GameState;
  currentPlayer: Player;
  onSendMessage: (message: string) => Promise<void> | void;
  isSubmitting: boolean;
}

const PHASE_LABEL: Record<string, string> = {
  PRE_SELECTION_DISCUSSION: '사전 대화',
  ROOM_DRAW: '방 뽑기',
  ROOM_SELECTION: '방 선택',
  DAY: '낮',
  DISCUSSION: '토론',
  WARDEN_ACTION: '교도관 행동',
  RESULT_DISCUSSION: '결과 토론',
  FINAL_VOTING: '최종 투표',
};

export const ChatPanel: React.FC<ChatPanelProps> = ({
  game,
  currentPlayer,
  onSendMessage,
  isSubmitting,
}) => {
  const [message, setMessage] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  const messages = useMemo(() => game.chatMessages || [], [game.chatMessages]);
  const canSend =
    game.status !== 'GAME_OVER' &&
    (game.status === 'LOBBY' || currentPlayer.status === 'ALIVE');

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = message.trim();
    if (!clean || !canSend || isSubmitting) return;
    setMessage('');
    await onSendMessage(clean);
  };

  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-950/90 overflow-hidden shadow-2xl">
      <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/70 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-red-950/60 border border-red-800/50 flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-red-400" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-black text-white">실시간 전체 채팅</h3>
            <p className="text-[11px] text-zinc-400 truncate">
              같은 게임방 참가자 전원에게 공개됩니다.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-900/60 rounded-full px-2.5 py-1">
          <Radio className="w-3 h-3" />
          LIVE
        </div>
      </div>

      <div ref={listRef} className="h-[52vh] min-h-[320px] max-h-[620px] overflow-y-auto p-4 space-y-3 bg-zinc-950">
        {messages.length === 0 ? (
          <div className="h-full min-h-[280px] flex flex-col items-center justify-center text-center px-6">
            <MessageCircle className="w-10 h-10 text-zinc-700 mb-3" />
            <p className="text-sm font-bold text-zinc-400">아직 채팅이 없습니다.</p>
            <p className="text-xs text-zinc-600 mt-1">첫 메시지를 보내 대화를 시작하세요.</p>
          </div>
        ) : (
          messages.map((item, index) => {
            const isMine = item.playerId === currentPlayer.id;
            const previous = messages[index - 1];
            const showRoundDivider = !previous || previous.round !== item.round;

            return (
              <React.Fragment key={item.id}>
                {showRoundDivider && (
                  <div className="flex items-center gap-2 py-1">
                    <div className="h-px flex-1 bg-zinc-900" />
                    <span className="text-[10px] font-mono font-bold text-zinc-600">
                      ROUND {String(item.round).padStart(2, '0')}
                    </span>
                    <div className="h-px flex-1 bg-zinc-900" />
                  </div>
                )}
                <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[82%] ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
                    <div className="flex items-center gap-2 px-1 mb-1">
                      {!isMine && <span className="text-[11px] font-bold text-zinc-300">{item.nickname}</span>}
                      <span className="text-[9px] text-zinc-600">
                        {PHASE_LABEL[item.phase] || item.phase}
                      </span>
                    </div>
                    <div
                      className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed break-words whitespace-pre-wrap ${
                        isMine
                          ? 'bg-red-600 text-white rounded-br-md'
                          : 'bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-bl-md'
                      }`}
                    >
                      {item.message}
                    </div>
                    <span className="text-[9px] text-zinc-700 mt-1 px-1">
                      {new Date(item.timestamp).toLocaleTimeString('ko-KR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              </React.Fragment>
            );
          })
        )}
      </div>

      <div className="border-t border-zinc-800 p-3 bg-zinc-900/70">
        {canSend ? (
          <form onSubmit={submit} className="flex items-end gap-2">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 300))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
              rows={1}
              maxLength={300}
              placeholder="메시지 입력..."
              className="flex-1 resize-none min-h-[44px] max-h-28 px-3.5 py-3 rounded-xl bg-zinc-950 border border-zinc-700 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-red-600"
            />
            <button
              type="submit"
              disabled={!message.trim() || isSubmitting}
              className="w-11 h-11 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-white transition-colors"
              aria-label="채팅 보내기"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <div className="h-11 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center gap-2 text-xs text-zinc-500">
            <Lock className="w-3.5 h-3.5" />
            {game.status === 'GAME_OVER'
              ? '게임이 종료되어 채팅 입력이 잠겼습니다.'
              : '사망/제외된 플레이어는 채팅을 읽을 수만 있습니다.'}
          </div>
        )}
        <div className="mt-1.5 text-right text-[9px] text-zinc-600">{message.length}/300</div>
      </div>
    </section>
  );
};
