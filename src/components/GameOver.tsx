import React from 'react';
import { Bot, RotateCcw, ShieldCheck, Skull, Users } from 'lucide-react';
import { GameState } from '../types';

interface Props {
  game: GameState;
  isHost: boolean;
  onLobby: (keepBots: boolean) => Promise<void>;
  busy: boolean;
}

export const GameOver: React.FC<Props> = ({ game, isHost, onLobby, busy }) => {
  const botCount = game.players.filter((p) => p.isBot).length;
  const humanCount = game.players.filter((p) => !p.isBot).length;

  return (
    <div className="space-y-5">
      <div className={`p-8 rounded-3xl border text-center ${game.winner === 'citizen' ? 'bg-blue-950/30 border-blue-800/50' : 'bg-red-950/30 border-red-800/50'}`}>
        {game.winner === 'citizen' ? <ShieldCheck className="w-12 h-12 text-blue-400 mx-auto"/> : <Skull className="w-12 h-12 text-red-400 mx-auto"/>}
        <div className="mt-4 text-xs tracking-[0.2em] font-black text-zinc-500">GAME OVER</div>
        <h1 className="mt-1 text-3xl font-black text-white">{game.winner === 'citizen' ? '시민 진영 승리' : '살인마 진영 승리'}</h1>
        <p className="mt-3 text-sm text-zinc-300">{game.winnerReason}</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {game.players.map((p) => (
          <div key={p.id} className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800">
            <div className="font-bold text-sm text-white truncate flex items-center gap-1.5">
              {p.nickname}
              {p.isBot && <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">BOT</span>}
            </div>
            <div className={`mt-1 text-xs ${p.role?.team === 'killer' ? 'text-red-300' : 'text-blue-300'}`}>{p.role?.emoji} {p.role?.name}</div>
          </div>
        ))}
      </div>

      {isHost ? (
        <div className="p-5 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-3">
          <div>
            <div className="font-black text-white">다음 게임은 어떻게 할까요?</div>
            <div className="mt-1 text-xs text-zinc-400">현재 사람 {humanCount}명 · BOT {botCount}명</div>
          </div>

          <button
            onClick={() => onLobby(true)}
            disabled={busy}
            className="w-full p-4 rounded-2xl bg-amber-950/30 border border-amber-800/60 text-left disabled:opacity-50"
          >
            <div className="font-black text-amber-200 flex items-center gap-2"><Bot className="w-5 h-5"/> BOT 유지하고 로비로</div>
            <div className="mt-1 text-xs leading-relaxed text-zinc-400">지금 BOT을 그대로 남깁니다. 친구가 새로 들어오면 BOT 한 자리가 자동으로 친구 자리로 바뀝니다.</div>
          </button>

          <button
            onClick={() => onLobby(false)}
            disabled={busy}
            className="w-full p-4 rounded-2xl bg-blue-950/30 border border-blue-800/60 text-left disabled:opacity-50"
          >
            <div className="font-black text-blue-200 flex items-center gap-2"><Users className="w-5 h-5"/> BOT 빼고 친구 기다리기</div>
            <div className="mt-1 text-xs leading-relaxed text-zinc-400">모든 BOT을 빼고 사람 참가자만 남깁니다. 친구가 다 모이지 않으면 나중에 다시 BOT으로 빈자리를 채울 수 있습니다.</div>
          </button>

          <div className="flex items-center justify-center gap-1.5 pt-1 text-[11px] text-zinc-500"><RotateCcw className="w-3.5 h-3.5"/> 둘 다 바로 시작하지 않고 로비에서 한 번 대기합니다.</div>
        </div>
      ) : (
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 text-center">
          <div className="font-bold text-zinc-200">방장이 다음 게임 인원을 정하는 중입니다.</div>
          <div className="mt-1 text-xs text-zinc-500">BOT을 유지할지 빼고 친구를 기다릴지 선택하면 모두 로비로 이동합니다.</div>
        </div>
      )}
    </div>
  );
};
