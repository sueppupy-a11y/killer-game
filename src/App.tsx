/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { GameState, GameMode, RoomId, PlayerStatus, TeamType, GameSettings } from './types';
import { getTeamColor } from './rolesData';
import {
  createGame,
  joinGame,
  leaveGame,
  fetchGameState,
  sendChatMessage,
  updateGameMode,
  fillBots,
  startGame,
  drawRoom,
  selectRoom,
  setPhase,
  skipDiscussion,
  policeArrest,
  corruptPoliceArrest,
  wardenJail,
  gamblerBet,
  usePrisonPass,
  resolveRound,
  nextRound,
  hostUpdatePlayer,
  hostEndGame,
  hostTogglePause,
  restartGame,
  hostUpdateSettings,
} from './api';

// Subcomponents
import { HomeStart } from './components/HomeStart';
import { GameLobby } from './components/GameLobby';
import { ChatPanel } from './components/ChatPanel';
import { InitialRoleModal, HoldToRevealRole } from './components/RoleRevealCard';
import { PhaseTimerBar } from './components/PhaseTimerBar';
import { RoomSelector } from './components/RoomSelector';
import { DayPhase } from './components/DayPhase';
import { PlayerList } from './components/PlayerList';
import { PoliceArrestModal } from './components/PoliceArrestModal';
import { RoleAbilityHub } from './components/RoleAbilityHub';
import { GameLog } from './components/GameLog';
import { HostDashboard } from './components/HostDashboard';
import { ResultScreen } from './components/ResultScreen';
import { RulesModal } from './components/RulesModal';

// Icons
import {
  Gamepad2,
  Users,
  Shield,
  ScrollText,
  Crown,
  HelpCircle,
  LogOut,
  AlertCircle,
  MessageCircle,
  Zap,
} from 'lucide-react';

type TabType = 'game' | 'chat' | 'ability' | 'players' | 'role' | 'logs' | 'host';

export default function App() {
  // App Session State
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabType>('game');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  // Modals
  const [showInitialRoleModal, setShowInitialRoleModal] = useState(false);
  const [showPoliceModal, setShowPoliceModal] = useState(false);
  const [rulesModalOpen, setRulesModalOpen] = useState(false);
  const [rulesModalTab, setRulesModalTab] = useState<'rules' | 'roles' | 'rooms'>('rules');

  // Track initial role acknowledgment per game session
  const acknowledgedRolesRef = useRef<Record<string, boolean>>({});

  // URL Query Code detection on initial load
  const [initialCode, setInitialCode] = useState<string>('');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const inviteCode = urlParams.get('code')?.trim().toUpperCase() || '';
    if (inviteCode) setInitialCode(inviteCode);

    // Invite links take priority over an old session from another game.
    const savedGameId = localStorage.getItem('killer_game_id')?.toUpperCase() || '';
    const savedPlayerId = localStorage.getItem('killer_player_id') || '';

    if (inviteCode && savedGameId && inviteCode !== savedGameId) {
      localStorage.removeItem('killer_game_id');
      localStorage.removeItem('killer_player_id');
      return;
    }

    const restoreGameId = inviteCode || savedGameId;
    if (restoreGameId && savedPlayerId && (!inviteCode || inviteCode === savedGameId)) {
      fetchGameState(restoreGameId, savedPlayerId)
        .then((game) => {
          setGameState(game);
          setCurrentUserId(savedPlayerId);
        })
        .catch(() => {
          localStorage.removeItem('killer_game_id');
          localStorage.removeItem('killer_player_id');
        });
    }
  }, []);

  // Always surface the result screen immediately when a game ends.
  useEffect(() => {
    if (gameState?.status === 'GAME_OVER') setActiveTab('game');
  }, [gameState?.status]);

  // Polling for real-time multiplayer synchronization
  useEffect(() => {
    if (!gameState || !currentUserId) return;

    const interval = setInterval(async () => {
      try {
        const updated = await fetchGameState(gameState.gameId, currentUserId);
        setGameState(updated);

        // Check if role should be shown initially when status changes to PLAYING
        if (
          updated.status === 'PLAYING' &&
          !acknowledgedRolesRef.current[updated.gameId + '_' + updated.round]
        ) {
          const self = updated.players.find((p) => p.id === currentUserId);
          if (self && self.role) {
            setShowInitialRoleModal(true);
            acknowledgedRolesRef.current[updated.gameId + '_' + updated.round] = true;
          }
        }
      } catch (err) {
        console.error('Polling sync error:', err);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState?.gameId, currentUserId]);

  const triggerToast = (msg: string) => {
    setErrorToast(msg);
    setTimeout(() => setErrorToast(null), 3500);
  };

  // 1. Create Game
  const handleCreateGame = async (nickname: string) => {
    setIsSubmitting(true);
    try {
      const res = await createGame(nickname);
      setGameState(res.game);
      setCurrentUserId(res.playerId);
      localStorage.setItem('killer_game_id', res.gameId);
      localStorage.setItem('killer_player_id', res.playerId);
      window.history.replaceState({}, '', `${window.location.pathname}?code=${res.gameId}`);
      setActiveTab('game');
    } catch (err: any) {
      triggerToast(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Join Game
  const handleJoinGame = async (gameId: string, nickname: string) => {
    setIsSubmitting(true);
    try {
      const res = await joinGame(gameId, nickname);
      setGameState(res.game);
      setCurrentUserId(res.playerId);
      localStorage.setItem('killer_game_id', res.gameId);
      localStorage.setItem('killer_player_id', res.playerId);
      window.history.replaceState({}, '', `${window.location.pathname}?code=${res.gameId}`);
      setActiveTab('game');
    } catch (err: any) {
      triggerToast(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Leave / Exit Room
  const handleLeaveGame = async () => {
    if (!gameState) return;

    if (gameState.status !== 'LOBBY') {
      triggerToast('게임 시작 후에는 참가 슬롯을 나갈 수 없습니다. 브라우저를 닫았다가 같은 링크로 다시 접속하면 복귀됩니다.');
      return;
    }

    if (!window.confirm('로비에서 나가시겠습니까? 참가 슬롯이 비워집니다.')) return;

    try {
      await leaveGame(gameState.gameId, currentUserId);
    } catch (err: any) {
      triggerToast(err.message);
      return;
    }

    localStorage.removeItem('killer_game_id');
    localStorage.removeItem('killer_player_id');
    setGameState(null);
    setCurrentUserId('');
    setActiveTab('game');
    window.history.replaceState({}, '', window.location.pathname);
  };

  // 4. Update Mode
  const handleUpdateMode = async (mode: GameMode, mapping?: Record<string, string>) => {
    if (!gameState) return;
    setIsSubmitting(true);
    try {
      const updated = await updateGameMode(gameState.gameId, currentUserId, mode, mapping);
      setGameState(updated);
    } catch (err: any) {
      triggerToast(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 5. Fill Bots
  const handleFillBots = async () => {
    if (!gameState) return;
    setIsSubmitting(true);
    try {
      const updated = await fillBots(gameState.gameId, currentUserId);
      setGameState(updated);
    } catch (err: any) {
      triggerToast(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 6. Start Game
  const handleStartGame = async () => {
    if (!gameState) return;
    setIsSubmitting(true);
    try {
      const updated = await startGame(gameState.gameId, currentUserId);
      setGameState(updated);
      setShowInitialRoleModal(true);
    } catch (err: any) {
      triggerToast(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 7. Draw Room / Select with Pass
  const handleDrawRoom = async (usePass: boolean, designatedRoom?: RoomId) => {
    if (!gameState) return;
    setIsSubmitting(true);
    try {
      const updated = await drawRoom(gameState.gameId, currentUserId, usePass, designatedRoom);
      setGameState(updated);
    } catch (err: any) {
      triggerToast(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 7b. Select Room (Pick 1 of 2 candidates and confirm)
  const handleSelectRoom = async (room: RoomId, confirm: boolean, usePass?: boolean) => {
    if (!gameState) return;
    setIsSubmitting(true);
    try {
      const updated = await selectRoom(gameState.gameId, currentUserId, room, confirm, usePass);
      setGameState(updated);
      if (confirm) {
        triggerToast(`[${room} ROOM] 선택이 확정되었습니다.`);
      }
    } catch (err: any) {
      triggerToast(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 7c. Set Phase (e.g. DAY -> DISCUSSION)
  const handleSetPhase = async (phase: string) => {
    if (!gameState) return;
    setIsSubmitting(true);
    try {
      const updated = await setPhase(gameState.gameId, currentUserId, phase);
      setGameState(updated);
    } catch (err: any) {
      triggerToast(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 8. Skip Discussion
  const handleSkipDiscussion = async () => {
    if (!gameState) return;
    setIsSubmitting(true);
    try {
      const updated = await skipDiscussion(gameState.gameId, currentUserId);
      setGameState(updated);
    } catch (err: any) {
      triggerToast(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 9. Police Arrest
  const handlePoliceArrest = async (targetPlayerId: string) => {
    if (!gameState) return;
    setIsSubmitting(true);
    try {
      const res = await policeArrest(gameState.gameId, currentUserId, targetPlayerId);
      setGameState(res.game);
      if (res.isRealKiller) {
        triggerToast(`🎉 살인마 [${res.targetNickname}] 체포 성공! 시민 진영이 승리했습니다!`);
      } else {
        triggerToast(`⚠️ [${res.targetNickname}] 님은 살인마가 아니었습니다. 동반 제외되었습니다.`);
      }
    } catch (err: any) {
      triggerToast(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 10. Corrupt Police Arrest
  const handleCorruptPoliceArrest = async (targetPlayerId: string) => {
    if (!gameState) return;
    setIsSubmitting(true);
    try {
      const updated = await corruptPoliceArrest(gameState.gameId, currentUserId, targetPlayerId);
      setGameState(updated);
      triggerToast('💥 동귀어진 체포를 집행하여 대상과 함께 게임에서 제외되었습니다.');
    } catch (err: any) {
      triggerToast(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 11. Warden Jail
  const handleWardenJail = async (targetPlayerId: string | null) => {
    if (!gameState) return;
    setIsSubmitting(true);
    try {
      const updated = await wardenJail(gameState.gameId, currentUserId, targetPlayerId);
      setGameState(updated);
      triggerToast('🔒 대상을 감옥(PRISON)으로 격리 지정했습니다.');
    } catch (err: any) {
      triggerToast(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 12. Gambler Bet
  const handleGamblerBet = async (betTeam: 'citizen' | 'killer') => {
    if (!gameState) return;
    setIsSubmitting(true);
    try {
      const updated = await gamblerBet(gameState.gameId, currentUserId, betTeam);
      setGameState(updated);
      triggerToast(`🎲 ${betTeam === 'citizen' ? '시민 진영' : '살인마 진영'}에 베팅을 완료했습니다.`);
    } catch (err: any) {
      triggerToast(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 13. Use Prison Pass
  const handleUsePrisonPass = async () => {
    if (!gameState) return;
    setIsSubmitting(true);
    try {
      const updated = await usePrisonPass(gameState.gameId, currentUserId);
      setGameState(updated);
      triggerToast('🎫 탈옥권을 사용하여 감옥에서 벗어났습니다!');
    } catch (err: any) {
      triggerToast(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 14. Host Resolve Round
  const handleResolveRound = async () => {
    if (!gameState) return;
    setIsSubmitting(true);
    try {
      const updated = await resolveRound(gameState.gameId, currentUserId);
      setGameState(updated);
    } catch (err: any) {
      triggerToast(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 15. Host Next Round
  const handleNextRound = async () => {
    if (!gameState) return;
    setIsSubmitting(true);
    try {
      const updated = await nextRound(gameState.gameId, currentUserId);
      setGameState(updated);
    } catch (err: any) {
      triggerToast(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 16. Host Update Player
  const handleHostUpdatePlayer = async (
    targetPlayerId: string,
    newStatus?: PlayerStatus,
    newRoom?: RoomId
  ) => {
    if (!gameState) return;
    setIsSubmitting(true);
    try {
      const updated = await hostUpdatePlayer(
        gameState.gameId,
        currentUserId,
        targetPlayerId,
        newStatus,
        newRoom
      );
      setGameState(updated);
    } catch (err: any) {
      triggerToast(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 17. Host End Game
  const handleHostEndGame = async (winner: TeamType, winnerReason: string) => {
    if (!gameState) return;
    setIsSubmitting(true);
    try {
      const updated = await hostEndGame(gameState.gameId, currentUserId, winner, winnerReason);
      setGameState(updated);
    } catch (err: any) {
      triggerToast(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 18. Host Toggle Pause
  const handleHostTogglePause = async () => {
    if (!gameState) return;
    setIsSubmitting(true);
    try {
      const updated = await hostTogglePause(gameState.gameId, currentUserId);
      setGameState(updated);
    } catch (err: any) {
      triggerToast(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 19. Restart Game
  const handleRestartGame = async () => {
    if (!gameState) return;
    setIsSubmitting(true);
    try {
      const updated = await restartGame(gameState.gameId, currentUserId);
      setGameState(updated);
      setActiveTab('game');
    } catch (err: any) {
      triggerToast(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 20. Update Settings
  const handleUpdateSettings = async (settings: Partial<GameSettings>) => {
    if (!gameState) return;
    setIsSubmitting(true);
    try {
      const updated = await hostUpdateSettings(gameState.gameId, currentUserId, settings);
      setGameState(updated);
    } catch (err: any) {
      triggerToast(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 21. Public Room Chat
  const handleSendChatMessage = async (message: string) => {
    if (!gameState) return;
    setIsSubmitting(true);
    try {
      const updated = await sendChatMessage(gameState.gameId, currentUserId, message);
      setGameState(updated);
    } catch (err: any) {
      triggerToast(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenRules = (tab: 'rules' | 'roles' | 'rooms' = 'rules') => {
    setRulesModalTab(tab);
    setRulesModalOpen(true);
  };

  // Current Player & Host status
  const currentPlayer = gameState?.players.find((p) => p.id === currentUserId);
  const isHost = currentPlayer?.isHost || false;

  // ----------------------------------------------------
  // RENDER: First Screen (Not in any game)
  // ----------------------------------------------------
  if (!gameState) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between selection:bg-red-600 selection:text-white">
        <HomeStart
          onCreateGame={handleCreateGame}
          onJoinGame={handleJoinGame}
          onOpenRules={handleOpenRules}
          isSubmitting={isSubmitting}
          initialCode={initialCode}
        />

        {/* Global Toast */}
        {errorToast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-red-950/90 border border-red-700 text-red-200 text-sm font-semibold shadow-2xl flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            {errorToast}
          </div>
        )}

        <RulesModal
          isOpen={rulesModalOpen}
          onClose={() => setRulesModalOpen(false)}
          initialTab={rulesModalTab}
        />
      </main>
    );
  }

  // ----------------------------------------------------
  // RENDER: Inside Game Room
  // ----------------------------------------------------
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between pb-20 selection:bg-red-600 selection:text-white">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          {/* Room Code & Info */}
          <div className="flex items-center gap-2.5">
            <div className="flex flex-col">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                살인자 게임
              </span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-red-500 text-sm">
                  #{gameState.gameId}
                </span>
                {currentPlayer?.nickname && (
                  <span className="text-xs text-zinc-300 font-semibold truncate max-w-[120px]">
                    ({currentPlayer.nickname})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Round Indicator Badge (if playing) */}
          {gameState.status === 'PLAYING' && (
            <div className="px-3 py-1 rounded-full bg-zinc-900 border border-red-900/60 flex items-center gap-1.5 shadow-inner">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="font-mono font-black text-xs text-white">
                ROUND {String(gameState.round).padStart(2, '0')} / {gameState.maxRound}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleOpenRules('rules')}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer"
              title="게임 규칙 가이드"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={handleLeaveGame}
              className="p-2 rounded-xl text-zinc-400 hover:text-red-400 hover:bg-zinc-900 transition-colors cursor-pointer"
              title="방 나가기"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 space-y-5 animate-fadeIn">
        {/* LOBBY STATE */}
        {gameState.status === 'LOBBY' && activeTab === 'game' && (
          <GameLobby
            game={gameState}
            currentUserId={currentUserId}
            isHost={isHost}
            onUpdateMode={handleUpdateMode}
            onFillBots={handleFillBots}
            onStartGame={handleStartGame}
            isSubmitting={isSubmitting}
          />
        )}

        {/* GAME OVER STATE */}
        {gameState.status === 'GAME_OVER' && activeTab === 'game' && (
          <ResultScreen
            game={gameState}
            isHost={isHost}
            onRestart={handleRestartGame}
            isSubmitting={isSubmitting}
          />
        )}

        {/* REAL-TIME CHAT TAB - available from lobby through active game */}
        {activeTab === 'chat' && currentPlayer && (
          <ChatPanel
            game={gameState}
            currentPlayer={currentPlayer}
            onSendMessage={handleSendChatMessage}
            isSubmitting={isSubmitting}
          />
        )}

        {/* PLAYING / PAUSED STATE */}
        {(gameState.status === 'PLAYING' || gameState.status === 'PAUSED') && (
          <div className="space-y-5">
            {/* Phase Timer & Countdown Bar */}
            <PhaseTimerBar
              game={gameState}
              isHost={isHost}
              onSkipDiscussion={handleSkipDiscussion}
              isSubmitting={isSubmitting}
            />

            {/* TAB: GAME (Main Play Screen) */}
            {activeTab === 'game' && (
              <div className="space-y-5">
                {gameState.phase === 'PRE_SELECTION_DISCUSSION' && (
                  <div className="p-5 rounded-3xl bg-zinc-900/80 border border-zinc-800 space-y-3">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="w-5 h-5 text-blue-400" />
                      <h3 className="font-black text-white">사전 대화 · 특수능력 단계</h3>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      채팅에서 전략을 논의하고, 사용형 직업은 아래의 <strong className="text-yellow-400">능력</strong> 탭에서 행동을 먼저 처리하세요. 시간이 끝나면 방 선택으로 자동 이동합니다.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => setActiveTab('chat')} className="py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-sm font-bold text-white">채팅 열기</button>
                      <button type="button" onClick={() => setActiveTab('ability')} className="py-3 rounded-xl bg-yellow-500 text-zinc-950 text-sm font-black">능력 사용</button>
                    </div>
                  </div>
                )}

                {/* 1. Room Selection Phase (2-Candidate Picker) */}
                {currentPlayer &&
                  (gameState.phase === 'ROOM_SELECTION' || gameState.phase === 'ROOM_DRAW') && (
                    <RoomSelector
                      game={gameState}
                      currentPlayer={currentPlayer}
                      onDrawRoom={handleDrawRoom}
                      onSelectRoom={handleSelectRoom}
                      onUsePrisonPass={handleUsePrisonPass}
                      isSubmitting={isSubmitting}
                    />
                  )}

                {/* 2. DAY Phase Display */}
                {currentPlayer && gameState.phase === 'DAY' && (
                  <DayPhase
                    game={gameState}
                    currentPlayer={currentPlayer}
                    onGoToDiscussion={() => handleSetPhase('DISCUSSION')}
                    onSelectTab={(tab) => {
                      if (tab === 'hub') setActiveTab('role');
                      else if (tab === 'players') setActiveTab('players');
                      else if (tab === 'logs') setActiveTab('logs');
                    }}
                    isHost={isHost}
                    isSubmitting={isSubmitting}
                  />
                )}

                {/* 4. In-Game Hold-to-Reveal Role Card */}
                {currentPlayer?.role && (
                  <div className="pt-2">
                    <HoldToRevealRole role={currentPlayer.role} />
                  </div>
                )}
              </div>
            )}

            {/* TAB: ABILITY - dedicated role ability controls */}
            {activeTab === 'ability' && currentPlayer && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-yellow-950/20 border border-yellow-800/40">
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-400" />
                    <div>
                      <h3 className="text-sm font-black text-white">내 특수능력</h3>
                      <p className="text-[11px] text-zinc-400">사용형 능력은 여기서 직접 실행합니다. 자동/패시브 능력은 발동 조건과 결과가 표시됩니다.</p>
                    </div>
                  </div>
                </div>
                <RoleAbilityHub
                  game={gameState}
                  currentPlayer={currentPlayer}
                  onPoliceArrest={handlePoliceArrest}
                  onCorruptPoliceArrest={handleCorruptPoliceArrest}
                  onWardenJail={handleWardenJail}
                  onGamblerBet={handleGamblerBet}
                  onUsePrisonPass={handleUsePrisonPass}
                  isSubmitting={isSubmitting}
                />
              </div>
            )}

            {/* TAB: PLAYERS (List of 12) */}
            {activeTab === 'players' && (
              <PlayerList game={gameState} currentUserId={currentUserId} />
            )}

            {/* TAB: MY ROLE (Full Role Detail & Hold Card) */}
            {activeTab === 'role' && currentPlayer?.role && (
              <div className="space-y-5">
                <HoldToRevealRole role={currentPlayer.role} />

                {/* Static Role Information Guide */}
                <div
                  className={`p-6 rounded-3xl border ${
                    getTeamColor(currentPlayer.role.team).border
                  } ${getTeamColor(currentPlayer.role.team).bg} space-y-4`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs uppercase font-bold text-zinc-400">
                        {currentPlayer.role.teamName}
                      </span>
                      <h2 className="text-2xl font-black text-white">{currentPlayer.role.name}</h2>
                    </div>
                    <span
                      className={`px-3 py-1 text-xs font-bold rounded-full ${
                        getTeamColor(currentPlayer.role.team).badge
                      }`}
                    >
                      {currentPlayer.role.teamName}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-300 leading-relaxed italic">
                    "{currentPlayer.role.tagline}"
                  </p>

                  <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-2 text-xs">
                    <div>
                      <strong className="text-zinc-300">🎯 승리 목표: </strong>
                      <span className="text-zinc-200">{currentPlayer.role.winCondition}</span>
                    </div>
                    <div>
                      <strong className="text-zinc-300">📋 역할 개요: </strong>
                      <span className="text-zinc-300">{currentPlayer.role.description}</span>
                    </div>
                    {currentPlayer.role.abilityName && (
                      <div className="pt-2 border-t border-zinc-800">
                        <strong className="text-yellow-400">⚡ 특수 행동: </strong>
                        <span className="text-zinc-200">
                          {currentPlayer.role.abilityName} (
                          {currentPlayer.role.abilityDescription})
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {(gameState.status === 'PLAYING' || gameState.status === 'PAUSED') && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('ability')}
                    className="w-full py-3.5 rounded-2xl bg-yellow-500 text-zinc-950 font-black text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                  >
                    <Zap className="w-4 h-4" />
                    특수능력 화면 열기
                  </button>
                )}
              </div>
            )}

            {/* TAB: LOGS */}
            {activeTab === 'logs' && <GameLog logs={gameState.logs} />}

            {/* TAB: HOST DASHBOARD */}
            {activeTab === 'host' && isHost && (
              <HostDashboard
                game={gameState}
                onResolveRound={handleResolveRound}
                onNextRound={handleNextRound}
                onSkipDiscussion={handleSkipDiscussion}
                onTogglePause={handleHostTogglePause}
                onUpdatePlayer={handleHostUpdatePlayer}
                onEndGame={handleHostEndGame}
                onRestartGame={handleRestartGame}
                onUpdateSettings={handleUpdateSettings}
                isSubmitting={isSubmitting}
              />
            )}
          </div>
        )}
      </main>

      {/* Bottom Sticky Tab Navigation */}
      {gameState && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800 px-2 py-1.5">
          <div className="max-w-2xl mx-auto flex gap-1 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab('game')}
              className={`min-w-[64px] flex-1 py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                activeTab === 'game'
                  ? 'text-red-500 bg-red-950/30 font-bold'
                  : 'text-zinc-400 hover:text-zinc-200 font-medium'
              }`}
            >
              <Gamepad2 className="w-5 h-5" />
              <span className="text-[11px]">게임</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('chat')}
              className={`min-w-[64px] flex-1 py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                activeTab === 'chat'
                  ? 'text-red-500 bg-red-950/30 font-bold'
                  : 'text-zinc-400 hover:text-zinc-200 font-medium'
              }`}
            >
              <MessageCircle className="w-5 h-5" />
              <span className="text-[11px]">채팅</span>
            </button>

            {(gameState.status === 'PLAYING' || gameState.status === 'PAUSED') && (
              <button
                type="button"
                onClick={() => setActiveTab('ability')}
                className={`min-w-[64px] flex-1 py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  activeTab === 'ability'
                    ? 'text-yellow-400 bg-yellow-950/30 font-bold'
                    : 'text-zinc-400 hover:text-zinc-200 font-medium'
                }`}
              >
                <Zap className="w-5 h-5" />
                <span className="text-[11px]">능력</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab('players')}
              className={`min-w-[64px] flex-1 py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                activeTab === 'players'
                  ? 'text-red-500 bg-red-950/30 font-bold'
                  : 'text-zinc-400 hover:text-zinc-200 font-medium'
              }`}
            >
              <Users className="w-5 h-5" />
              <span className="text-[11px]">참가자</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('role')}
              className={`min-w-[64px] flex-1 py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                activeTab === 'role'
                  ? 'text-red-500 bg-red-950/30 font-bold'
                  : 'text-zinc-400 hover:text-zinc-200 font-medium'
              }`}
            >
              <Shield className="w-5 h-5" />
              <span className="text-[11px]">내 역할</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('logs')}
              className={`min-w-[64px] flex-1 py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                activeTab === 'logs'
                  ? 'text-red-500 bg-red-950/30 font-bold'
                  : 'text-zinc-400 hover:text-zinc-200 font-medium'
              }`}
            >
              <ScrollText className="w-5 h-5" />
              <span className="text-[11px]">기록</span>
            </button>

            {isHost && (
              <button
                type="button"
                onClick={() => setActiveTab('host')}
                className={`min-w-[64px] flex-1 py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  activeTab === 'host'
                    ? 'text-amber-400 bg-amber-950/30 font-bold'
                    : 'text-amber-500/70 hover:text-amber-300 font-medium'
                }`}
              >
                <Crown className="w-5 h-5" />
                <span className="text-[11px]">HOST</span>
              </button>
            )}
          </div>
        </nav>
      )}

      {/* Initial Role Confirmation Modal on Game Start */}
      {showInitialRoleModal && currentPlayer?.role && (
        <InitialRoleModal
          role={currentPlayer.role}
          isOpen={showInitialRoleModal}
          onConfirm={() => setShowInitialRoleModal(false)}
        />
      )}

      {/* Police Arrest Modal */}
      {showPoliceModal && (
        <PoliceArrestModal
          isOpen={showPoliceModal}
          onClose={() => setShowPoliceModal(false)}
          alivePlayers={gameState.players.filter((p) => p.status === 'ALIVE')}
          currentUserId={currentUserId}
          onConfirmArrest={handlePoliceArrest}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Rules Guide Modal */}
      <RulesModal
        isOpen={rulesModalOpen}
        onClose={() => setRulesModalOpen(false)}
        initialTab={rulesModalTab}
      />

      {/* Toast Notification */}
      {errorToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-red-950/90 border border-red-700 text-red-200 text-sm font-semibold shadow-2xl flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-400" />
          {errorToast}
        </div>
      )}
    </div>
  );
}
