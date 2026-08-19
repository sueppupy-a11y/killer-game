import React, { useMemo, useState } from 'react';
import { CheckCircle2, Moon, Target } from 'lucide-react';
import { GameState, NightActionType, Player } from '../types';

const LABEL: Record<NightActionType, { title: string; button: string; help: string }> = {
  KILL: { title: '오늘 밤 제거할 사람', button: '살해 대상으로 선택', help: '의사나 경호원이 막을 수도 있습니다.' },
  SPY_SCAN: { title: '신분을 탐색할 사람', button: '신분 탐색', help: '특수능력 보유 여부만 확인합니다.' },
  BLOCK: { title: '능력을 방해할 사람', button: '밤 능력 방해', help: '선택한 사람의 이번 밤 능력이 실패합니다.' },
  POLICE_CHECK: { title: '조사할 사람', button: '진영 조사', help: '살인마 진영인지 확인합니다.' },
  HEAL: { title: '보호할 사람', button: '치료하기', help: '그 사람이 공격받으면 살릴 수 있습니다.' },
  GUARD: { title: '경호할 사람', button: '경호하기', help: '그 사람이 공격받으면 대신 공격을 받습니다.' },
  TRACK: { title: '추적할 사람', button: '추적하기', help: '그 사람이 누구에게 능력을 사용했는지 확인합니다.' },
  SENSE: { title: '감지할 사람', button: '능력 흔적 감지', help: '그 사람이 실제로 능력을 사용했는지 확인합니다.' },
};

export const NightPanel: React.FC<{ game: GameState; me: Player; onSubmit: (type: NightActionType, targetId: string) => Promise<void>; busy: boolean }> = ({ game, me, onSubmit, busy }) => {
  const type = game.requiredNightAction || null;
  const [selected, setSelected] = useState('');
  const submitted = !!game.myNightAction;
  const targets = useMemo(() => {
    if (!type) return [];
    return game.players.filter((p) => p.status === 'ALIVE' && (type === 'HEAL' || p.id !== me.id) && !((type === 'KILL' || type === 'SPY_SCAN' || type === 'BLOCK') && p.role?.team === 'killer'));
  }, [game.players, me.id, type]);

  if (me.status !== 'ALIVE') return <Waiting text="탈락한 플레이어는 밤 행동을 할 수 없습니다."/>;
  if (!type) return <Waiting text="이번 밤에는 사용할 능력이 없습니다. 다른 플레이어를 기다리세요."/>;
  const meta = LABEL[type];
  if (submitted) {
    const target = game.players.find((p) => p.id === game.myNightAction?.targetPlayerId);
    return <div className="p-6 rounded-3xl bg-emerald-950/30 border border-emerald-800/50 text-center space-y-3"><CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto"/><div className="font-black text-white">선택 완료</div><div className="text-sm text-emerald-300">{target?.nickname || '대상'}님에게 능력을 사용합니다.</div><div className="text-xs text-zinc-500">다른 플레이어의 선택을 기다리는 중...</div></div>;
  }

  return (
    <div className="p-5 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-4">
      <div className="text-center"><Moon className="w-8 h-8 text-indigo-400 mx-auto"/><h2 className="mt-2 text-xl font-black text-white">{meta.title}</h2><p className="mt-1 text-xs text-zinc-400">{meta.help}</p></div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {targets.map((p) => <button key={p.id} onClick={() => setSelected(p.id)} className={`p-3 rounded-2xl border text-left transition ${selected === p.id ? 'bg-indigo-950/60 border-indigo-500 ring-1 ring-indigo-500/40' : 'bg-zinc-950 border-zinc-800 hover:border-zinc-600'}`}><div className="text-sm font-bold text-white truncate">{p.nickname}</div><div className="mt-1 text-[10px] text-zinc-500">{p.isBot ? 'BOT' : '참가자'}</div></button>)}
      </div>
      <button disabled={!selected || busy} onClick={() => selected && onSubmit(type, selected)} className="w-full py-4 rounded-2xl bg-indigo-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-black flex items-center justify-center gap-2"><Target className="w-5 h-5"/>{meta.button}</button>
    </div>
  );
};

const Waiting: React.FC<{ text: string }> = ({ text }) => <div className="p-7 rounded-3xl bg-zinc-900 border border-zinc-800 text-center"><Moon className="w-8 h-8 text-indigo-400 mx-auto"/><div className="mt-3 font-black text-white">조용한 밤입니다</div><p className="mt-2 text-sm text-zinc-400 leading-relaxed">{text}</p></div>;
