import React, { useEffect, useMemo, useState } from 'react';
import { Crown, HelpCircle, LogOut, Pause, Play, Shield, Users, X } from 'lucide-react';
import { BotDifficulty, GameState, NightActionType } from './types';
import {
  createGame, fetchGameState, fillBots, joinGame, leaveGame, revealMayor, returnToLobby,
  sendChat, startGame, submitNightAction, submitVote, togglePause, updateSettings,
} from './api';
import { HomeStart } from './components/HomeStart';
import { GameLobby } from './components/GameLobby';
import { PhaseBanner } from './components/PhaseBanner';
import { RoleCard } from './components/RoleCard';
import { NightPanel } from './components/NightPanel';
import { DiscussionPanel } from './components/DiscussionPanel';
import { VotePanel } from './components/VotePanel';
import { ExecutionPanel, MorningPanel } from './components/ResultPanel';
import { PlayerList } from './components/PlayerList';
import { RulesModal } from './components/RulesModal';
import { GameOver } from './components/GameOver';

export default function App() {
  const [game, setGame] = useState<GameState | null>(null);
  const [playerId, setPlayerId] = useState('');
  const [initialCode, setInitialCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showRole, setShowRole] = useState(false);
  const [showPlayers, setShowPlayers] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showHost, setShowHost] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invite = params.get('code')?.trim().toUpperCase() || '';
    setInitialCode(invite);
    const savedCode = localStorage.getItem('killer_v6_game') || '';
    const savedPlayer = localStorage.getItem('killer_v6_player') || '';
    if (invite && savedCode && invite !== savedCode) {
      localStorage.removeItem('killer_v6_game'); localStorage.removeItem('killer_v6_player');
      return;
    }
    const code = invite || savedCode;
    if (code && savedPlayer && (!invite || invite === savedCode)) {
      fetchGameState(code, savedPlayer).then((g) => { setGame(g); setPlayerId(savedPlayer); }).catch(() => {
        localStorage.removeItem('killer_v6_game'); localStorage.removeItem('killer_v6_player');
      });
    }
  }, []);

  useEffect(() => {
    if (!game || !playerId) return;
    const t = setInterval(async () => {
      try { setGame(await fetchGameState(game.gameId, playerId)); } catch {}
    }, 700);
    return () => clearInterval(t);
  }, [game?.gameId, playerId]);

  useEffect(() => {
    if (!game) return;
    if (game.status === 'PLAYING' && game.phase === 'ROLE_REVEAL') setShowRole(true);
  }, [game?.status, game?.phase, game?.round]);

  const me = useMemo(() => game?.players.find((p) => p.id === playerId), [game, playerId]);
  const isHost = !!me?.isHost;

  const notify = (message: string) => { setToast(message); setTimeout(() => setToast(null), 3200); };
  const run = async (fn: () => Promise<void>) => { setBusy(true); try { await fn(); } catch (e: any) { notify(e.message || '오류가 발생했습니다.'); } finally { setBusy(false); } };
  const saveSession = (code: string, pid: string) => {
    localStorage.setItem('killer_v6_game', code); localStorage.setItem('killer_v6_player', pid);
    window.history.replaceState({}, '', `${window.location.pathname}?code=${code}`);
  };

  const handleCreate = (nickname: string) => run(async () => {
    const r = await createGame(nickname); setGame(r.game); setPlayerId(r.playerId); saveSession(r.gameId, r.playerId);
  });
  const handleJoin = (code: string, nickname: string) => run(async () => {
    const r = await joinGame(code, nickname); setGame(r.game); setPlayerId(r.playerId); saveSession(r.gameId, r.playerId);
  });
  const handleLeave = () => run(async () => {
    if (!game) return;
    if (game.status !== 'LOBBY') { notify('게임 중에는 나갈 필요가 없습니다. 창을 닫았다가 같은 링크로 돌아오면 복귀됩니다.'); return; }
    if (!confirm('게임방에서 나갈까요?')) return;
    await leaveGame(game.gameId, playerId);
    localStorage.removeItem('killer_v6_game'); localStorage.removeItem('killer_v6_player');
    setGame(null); setPlayerId(''); window.history.replaceState({}, '', window.location.pathname);
  });

  if (!game || !me) return <><HomeStart onCreate={handleCreate} onJoin={handleJoin} initialCode={initialCode} busy={busy}/>{toast && <Toast text={toast}/>}</>;

  const update = (promise: Promise<GameState>) => run(async () => setGame(await promise));

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-8">
      <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur border-b border-zinc-800">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0"><div className="text-[9px] font-black tracking-[0.2em] text-zinc-600">KILLER GAME</div><div className="flex items-center gap-2"><span className="font-mono font-black text-red-500">#{game.gameId}</span><span className="text-xs text-zinc-400 truncate">{me.nickname}</span></div></div>
          <div className="flex items-center gap-1">
            {game.status !== 'LOBBY' && <button onClick={() => setShowRole(true)} className="p-2 rounded-xl text-zinc-400 hover:bg-zinc-900" title="내 역할"><Shield className="w-5 h-5"/></button>}
            <button onClick={() => setShowPlayers(true)} className="p-2 rounded-xl text-zinc-400 hover:bg-zinc-900" title="참가자"><Users className="w-5 h-5"/></button>
            <button onClick={() => setShowRules(true)} className="p-2 rounded-xl text-zinc-400 hover:bg-zinc-900" title="규칙"><HelpCircle className="w-5 h-5"/></button>
            {isHost && game.status !== 'LOBBY' && <button onClick={() => setShowHost(true)} className="p-2 rounded-xl text-amber-500 hover:bg-zinc-900" title="방장"><Crown className="w-5 h-5"/></button>}
            {game.status === 'LOBBY' && <button onClick={handleLeave} className="p-2 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-zinc-900" title="나가기"><LogOut className="w-5 h-5"/></button>}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        {game.status === 'LOBBY' && <GameLobby game={game} currentUserId={playerId} onFillBots={() => update(fillBots(game.gameId, playerId))} onStart={() => update(startGame(game.gameId, playerId))} onDifficulty={(d: BotDifficulty) => update(updateSettings(game.gameId, playerId, { botDifficulty: d }))} busy={busy}/>} 

        {(game.status === 'PLAYING' || game.status === 'PAUSED') && <>
          <PhaseBanner game={game}/>
          {game.status === 'PAUSED' ? <div className="p-8 rounded-3xl bg-amber-950/20 border border-amber-800/40 text-center"><Pause className="w-10 h-10 text-amber-400 mx-auto"/><div className="mt-3 font-black text-white">게임이 일시정지되었습니다</div><div className="mt-2 text-sm text-zinc-400">방장이 다시 시작하면 현재 단계부터 이어집니다.</div></div> : <>
            {game.phase === 'ROLE_REVEAL' && <div className="space-y-3"><RoleCard game={game} player={me}/><div className="text-center text-xs text-zinc-500">잠시 후 자동으로 밤이 시작됩니다.</div></div>}
            {game.phase === 'NIGHT' && <NightPanel game={game} me={me} onSubmit={(type: NightActionType, targetId: string) => update(submitNightAction(game.gameId, playerId, type, targetId))} busy={busy}/>} 
            {game.phase === 'MORNING' && <MorningPanel game={game} me={me}/>} 
            {game.phase === 'DISCUSSION' && <DiscussionPanel game={game} me={me} onSend={(message) => update(sendChat(game.gameId, playerId, message))} onRevealMayor={() => update(revealMayor(game.gameId, playerId))} busy={busy}/>} 
            {game.phase === 'VOTE' && <VotePanel game={game} me={me} onVote={(targetId) => update(submitVote(game.gameId, playerId, targetId))} busy={busy}/>} 
            {game.phase === 'EXECUTION' && <ExecutionPanel game={game}/>} 
          </>}
        </>}

        {game.status === 'GAME_OVER' && <GameOver game={game} isHost={isHost} onLobby={() => update(returnToLobby(game.gameId, playerId))} busy={busy}/>} 
      </main>

      {showRole && me.role && <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm p-4 flex items-center justify-center"><div className="w-full max-w-md"><RoleCard game={game} player={me} onClose={() => setShowRole(false)}/></div></div>}
      {showPlayers && <PlayerList game={game} currentUserId={playerId} onClose={() => setShowPlayers(false)}/>} 
      {showRules && <RulesModal onClose={() => setShowRules(false)}/>} 
      {showHost && <HostModal game={game} busy={busy} onClose={() => setShowHost(false)} onPause={() => update(togglePause(game.gameId, playerId))} onLobby={() => run(async () => { if (!confirm('현재 게임을 종료하고 로비로 돌아갈까요?')) return; setGame(await returnToLobby(game.gameId, playerId)); setShowHost(false); })}/>} 
      {toast && <Toast text={toast}/>} 
    </div>
  );
}

const Toast: React.FC<{ text: string }> = ({ text }) => <div className="fixed z-[80] left-1/2 -translate-x-1/2 bottom-6 max-w-[90vw] px-4 py-3 rounded-2xl bg-red-950 border border-red-800 text-sm text-red-100 shadow-2xl">{text}</div>;

const HostModal: React.FC<{ game: GameState; busy: boolean; onClose: () => void; onPause: () => void; onLobby: () => void }> = ({ game, busy, onClose, onPause, onLobby }) => (
  <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm p-4 flex items-center justify-center">
    <div className="w-full max-w-sm rounded-3xl bg-zinc-950 border border-zinc-800 p-5 space-y-4">
      <div className="flex items-center justify-between"><div><div className="text-xs font-black text-amber-400">HOST</div><div className="font-black text-white">방장 관리</div></div><button onClick={onClose} className="p-2 rounded-xl bg-zinc-900 text-zinc-400"><X className="w-4 h-4"/></button></div>
      <button disabled={busy} onClick={onPause} className="w-full py-3.5 rounded-2xl bg-zinc-900 border border-zinc-700 font-bold flex items-center justify-center gap-2">{game.status==='PAUSED'?<Play className="w-4 h-4 text-emerald-400"/>:<Pause className="w-4 h-4 text-amber-400"/>}{game.status==='PAUSED'?'게임 재개':'일시정지'}</button>
      <button disabled={busy} onClick={onLobby} className="w-full py-3.5 rounded-2xl bg-red-950/50 border border-red-800 text-red-300 font-bold">게임 강제 종료 → 로비</button>
      <p className="text-[11px] text-zinc-500 text-center">일반 진행은 전부 자동입니다. 문제가 있을 때만 사용하세요.</p>
    </div>
  </div>
);
