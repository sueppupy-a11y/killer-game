import React, { useEffect, useState } from 'react';
import { Gamepad2, LogIn, Plus, Users, Skull, ShieldCheck } from 'lucide-react';

interface Props {
  onCreate: (nickname: string) => Promise<void>;
  onJoin: (code: string, nickname: string) => Promise<void>;
  initialCode?: string;
  busy: boolean;
}

export const HomeStart: React.FC<Props> = ({ onCreate, onJoin, initialCode = '', busy }) => {
  const [nickname, setNickname] = useState('');
  const [code, setCode] = useState(initialCode);
  const [mode, setMode] = useState<'create' | 'join'>(initialCode ? 'join' : 'create');

  useEffect(() => { if (initialCode) { setCode(initialCode); setMode('join'); } }, [initialCode]);

  const submit = async () => {
    if (!nickname.trim()) return;
    if (mode === 'create') await onCreate(nickname.trim());
    else if (code.trim().length === 6) await onJoin(code.trim().toUpperCase(), nickname.trim());
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 rounded-3xl bg-red-600/15 border border-red-700/40 flex items-center justify-center">
            <Skull className="w-8 h-8 text-red-500" />
          </div>
          <div>
            <div className="text-xs tracking-[0.3em] text-red-400 font-black">MAFIA GAME</div>
            <h1 className="mt-1 text-3xl font-black tracking-tight">살인자 게임</h1>
            <p className="mt-2 text-sm text-zinc-400 leading-relaxed">밤에는 능력 사용, 낮에는 대화와 투표.<br/>화면에 뜨는 것만 따라가면 됩니다.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-900 rounded-2xl border border-zinc-800">
          <button onClick={() => setMode('create')} className={`py-3 rounded-xl text-sm font-bold transition ${mode === 'create' ? 'bg-red-600 text-white' : 'text-zinc-400'}`}>
            <Plus className="w-4 h-4 inline mr-1" /> 방 만들기
          </button>
          <button onClick={() => setMode('join')} className={`py-3 rounded-xl text-sm font-bold transition ${mode === 'join' ? 'bg-red-600 text-white' : 'text-zinc-400'}`}>
            <LogIn className="w-4 h-4 inline mr-1" /> 참가하기
          </button>
        </div>

        <div className="p-5 rounded-3xl bg-zinc-900/80 border border-zinc-800 space-y-4 shadow-2xl">
          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-zinc-400">닉네임</span>
            <input value={nickname} onChange={(e) => setNickname(e.target.value.slice(0, 16))} onKeyDown={(e) => e.key === 'Enter' && submit()} placeholder="친구들이 알아볼 이름" className="w-full px-4 py-3.5 rounded-2xl bg-zinc-950 border border-zinc-700 text-white placeholder:text-zinc-600 focus:outline-none focus:border-red-500" />
          </label>

          {mode === 'join' && (
            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-zinc-400">6자리 게임 코드</span>
              <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))} onKeyDown={(e) => e.key === 'Enter' && submit()} placeholder="ABC123" className="w-full px-4 py-3.5 rounded-2xl bg-zinc-950 border border-zinc-700 text-white font-mono text-xl tracking-[0.25em] uppercase placeholder:text-zinc-700 focus:outline-none focus:border-red-500" />
            </label>
          )}

          <button disabled={busy || !nickname.trim() || (mode === 'join' && code.length !== 6)} onClick={submit} className="w-full py-4 rounded-2xl bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-black transition flex items-center justify-center gap-2">
            <Gamepad2 className="w-5 h-5" /> {busy ? '처리 중...' : mode === 'create' ? '새 게임 만들기' : '게임 참가하기'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs text-zinc-400">
          <div className="p-3 rounded-2xl bg-zinc-900/50 border border-zinc-800 flex items-center gap-2"><Users className="w-4 h-4 text-blue-400" /> 12명 · 빈자리는 BOT</div>
          <div className="p-3 rounded-2xl bg-zinc-900/50 border border-zinc-800 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-400" /> 자동 진행</div>
        </div>
      </div>
    </div>
  );
};
