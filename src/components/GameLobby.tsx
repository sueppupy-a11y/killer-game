import React, { useEffect, useState } from 'react';
import { Bot, Check, Crown, Play, Share2, Sparkles, Trash2, Users } from 'lucide-react';
import { BotDifficulty, GameState } from '../types';

interface Props {
  game: GameState;
  currentUserId: string;
  onFillBots: () => Promise<void>;
  onRemoveBots: () => Promise<void>;
  onStart: () => Promise<void>;
  onDifficulty: (value: BotDifficulty) => Promise<void>;
  busy: boolean;
}

const DIFF: Array<{ id: BotDifficulty; name: string; desc: string }> = [
  { id: 'EASY', name: '쉬움', desc: '질문에는 답하지만 추리가 단순하고 실수도 많음' },
  { id: 'NORMAL', name: '보통', desc: '질문에 바로 반응하고 발언·투표를 기억하며 추리' },
  { id: 'HARD', name: '어려움', desc: '후속 질문 맥락과 모순·투표 패턴까지 적극 추적' },
];

export const GameLobby: React.FC<Props> = ({ game, currentUserId, onFillBots, onRemoveBots, onStart, onDifficulty, busy }) => {
  const me = game.players.find((p) => p.id === currentUserId);
  const isHost = !!me?.isHost;
  const [copied, setCopied] = useState(false);
  const realCount = game.players.filter((p) => !p.isBot).length;
  const botCount = game.players.filter((p) => p.isBot).length;
  const full = game.players.length === 12;
  const [countdown, setCountdown] = useState<number | null>(null);
  useEffect(() => {
    const update = () => setCountdown(game.lobbyAutoStartAt ? Math.max(0, Math.ceil((game.lobbyAutoStartAt - Date.now()) / 1000)) : null);
    update(); const t = setInterval(update, 250); return () => clearInterval(t);
  }, [game.lobbyAutoStartAt]);

  const copyLink = async () => {
    const url = `${window.location.origin}?code=${game.gameId}`;
    try {
      if (navigator.share) await navigator.share({ title: '살인자 게임 초대', text: `게임 코드 ${game.gameId}`, url });
      else await navigator.clipboard.writeText(url);
      setCopied(true); setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-5">
      <div className="p-6 rounded-3xl bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800 text-center shadow-2xl">
        <div className="text-[11px] font-black tracking-[0.25em] text-zinc-500">GAME CODE</div>
        <div className="mt-1 text-5xl font-black font-mono tracking-[0.18em] text-red-500 select-all">{game.gameId}</div>
        <button onClick={copyLink} className="mt-4 px-4 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-xs font-bold text-zinc-200 inline-flex items-center gap-2">
          {copied ? <Check className="w-4 h-4 text-emerald-400"/> : <Share2 className="w-4 h-4 text-blue-400"/>}{copied ? '초대 링크 복사됨' : '친구 초대 링크 공유'}
        </button>
        <div className="mt-5 pt-4 border-t border-zinc-800 flex items-center justify-center gap-4 text-sm">
          <span className="text-zinc-300"><Users className="w-4 h-4 inline mr-1"/>사람 <b className="text-white">{realCount}</b></span>
          <span className="text-zinc-300"><Bot className="w-4 h-4 inline mr-1"/>BOT <b className="text-white">{botCount}</b></span>
          <span className="font-mono font-black text-red-400">{game.players.length}/12</span>
        </div>
      </div>

      {isHost && (
        <div className="p-5 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-4">
          <div>
            <h3 className="font-black text-white flex items-center gap-2"><Sparkles className="w-4 h-4 text-amber-400"/> BOT 난이도</h3>
            <p className="mt-1 text-xs text-zinc-500">외부 AI 없이 규칙 기반으로 대화·추리·능력 사용·투표를 합니다.</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {DIFF.map((d) => (
              <button key={d.id} disabled={busy} onClick={() => onDifficulty(d.id)} className={`p-3 rounded-2xl border text-left transition ${game.settings.botDifficulty === d.id ? 'bg-red-950/40 border-red-600 ring-1 ring-red-600/40' : 'bg-zinc-950 border-zinc-800'}`}>
                <div className={`text-sm font-black ${game.settings.botDifficulty === d.id ? 'text-red-300' : 'text-zinc-200'}`}>{d.name}</div>
                <div className="mt-1 text-[10px] leading-relaxed text-zinc-500">{d.desc}</div>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {!full && (
              <button onClick={onFillBots} disabled={busy} className="w-full py-3.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 font-bold text-sm flex items-center justify-center gap-2">
                <Bot className="w-4 h-4 text-amber-400"/> 빈자리 BOT으로 채우기
              </button>
            )}
            {botCount > 0 && (
              <button onClick={onRemoveBots} disabled={busy} className="w-full py-3.5 rounded-2xl bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 font-bold text-sm text-zinc-300 flex items-center justify-center gap-2">
                <Trash2 className="w-4 h-4 text-zinc-500"/> BOT 모두 빼기
              </button>
            )}
          </div>
          {botCount > 0 && <p className="text-[11px] text-zinc-500 text-center">친구가 이 방에 들어오면 가득 찬 경우 BOT 한 명이 자동으로 빠지고 친구가 그 자리를 사용합니다.</p>}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {Array.from({ length: 12 }).map((_, i) => {
          const p = game.players[i];
          return <div key={p?.id || i} className={`p-3 rounded-2xl border ${p ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-950/50 border-dashed border-zinc-800'}`}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-zinc-800 flex items-center justify-center text-xs font-mono text-zinc-400">{String(i+1).padStart(2,'0')}</div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">{p ? p.nickname : '대기 중'}</div>
                {p && <div className="mt-0.5 text-[10px] text-zinc-500 flex items-center gap-1">{p.isHost && <Crown className="w-3 h-3 text-amber-400"/>}{p.isBot ? 'BOT' : p.id === currentUserId ? '나' : '참가자'}</div>}
              </div>
            </div>
          </div>;
        })}
      </div>

      {full ? (
        <div className="p-5 rounded-3xl bg-red-950/30 border border-red-800/60 text-center">
          <div className="text-sm font-black text-white">12명 준비 완료</div>
          <div className="mt-1 text-xs text-red-300">
            {countdown !== null
              ? `${countdown}초 후 자동으로 게임이 시작됩니다.`
              : botCount > 0
              ? 'BOT 자리에 친구가 들어올 수 있습니다. 준비되면 방장이 시작하세요.'
              : '모두 준비되었습니다. 방장이 시작하면 됩니다.'}
          </div>
          {isHost && <button onClick={onStart} disabled={busy} className="mt-3 px-5 py-2.5 rounded-xl bg-red-600 font-bold text-sm inline-flex items-center gap-2"><Play className="w-4 h-4"/> 지금 시작</button>}
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800 text-center text-xs text-zinc-400">
          {isHost ? '친구를 초대하거나 빈자리를 BOT으로 채워주세요.' : '방장이 인원을 채우는 중입니다.'}
        </div>
      )}
    </div>
  );
};
