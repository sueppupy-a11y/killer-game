import React from 'react';
import { RotateCcw, ShieldCheck, Skull } from 'lucide-react';
import { GameState } from '../types';

export const GameOver: React.FC<{ game: GameState; isHost: boolean; onLobby: () => Promise<void>; busy: boolean }> = ({ game, isHost, onLobby, busy }) => (
  <div className="space-y-5">
    <div className={`p-8 rounded-3xl border text-center ${game.winner==='citizen'?'bg-blue-950/30 border-blue-800/50':'bg-red-950/30 border-red-800/50'}`}>
      {game.winner==='citizen'?<ShieldCheck className="w-12 h-12 text-blue-400 mx-auto"/>:<Skull className="w-12 h-12 text-red-400 mx-auto"/>}
      <div className="mt-4 text-xs tracking-[0.2em] font-black text-zinc-500">GAME OVER</div>
      <h1 className="mt-1 text-3xl font-black text-white">{game.winner==='citizen'?'시민 진영 승리':'살인마 진영 승리'}</h1>
      <p className="mt-3 text-sm text-zinc-300">{game.winnerReason}</p>
    </div>
    <div className="grid grid-cols-2 gap-2">{game.players.map((p)=><div key={p.id} className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800"><div className="font-bold text-sm text-white truncate">{p.nickname}</div><div className={`mt-1 text-xs ${p.role?.team==='killer'?'text-red-300':'text-blue-300'}`}>{p.role?.emoji} {p.role?.name}</div></div>)}</div>
    {isHost && <button onClick={onLobby} disabled={busy} className="w-full py-4 rounded-2xl bg-zinc-800 border border-zinc-700 font-black flex items-center justify-center gap-2"><RotateCcw className="w-4 h-4"/> 같은 멤버로 다시 로비</button>}
  </div>
);
