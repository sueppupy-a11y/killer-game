import React, { useEffect, useState } from 'react';
import { GameState, GameMode, Player, GameSettings, BotDifficulty } from '../types';
import { FIXED_ROLES_PRESET, ROLES_DATA, getTeamColor } from '../rolesData';
import {
  Users,
  Copy,
  Check,
  Crown,
  Play,
  Bot,
  Radio,
  Share2,
  Shield,
  Skull,
} from 'lucide-react';

interface GameLobbyProps {
  game: GameState;
  currentUserId: string;
  isHost: boolean;
  onUpdateMode: (mode: GameMode, roleMapping?: Record<string, string>) => Promise<void>;
  onFillBots: () => Promise<void>;
  onUpdateSettings: (settings: Partial<GameSettings>) => Promise<void>;
  onStartGame: () => Promise<void>;
  isSubmitting: boolean;
}

export const GameLobby: React.FC<GameLobbyProps> = ({
  game,
  currentUserId,
  isHost,
  onUpdateMode,
  onFillBots,
  onUpdateSettings,
  onStartGame,
  isSubmitting,
}) => {
  const [copied, setCopied] = useState(false);
  const [roleMapping, setRoleMapping] = useState<Record<string, string>>(game.roleMapping || {});
  const [autoStartSeconds, setAutoStartSeconds] = useState<number | null>(null);

  const playerCount = game.players.length;
  const botCount = game.players.filter((p) => p.isBot).length;
  const humanCount = playerCount - botCount;
  const isFull = playerCount >= 12;

  useEffect(() => {
    if (!game.lobbyAutoStartAt || !isFull) {
      setAutoStartSeconds(null);
      return;
    }
    const update = () => setAutoStartSeconds(Math.max(0, Math.ceil((game.lobbyAutoStartAt! - Date.now()) / 1000)));
    update();
    const timer = setInterval(update, 200);
    return () => clearInterval(timer);
  }, [game.lobbyAutoStartAt, isFull]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(game.gameId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleShareLink = async () => {
    const url = window.location.origin + '?code=' + game.gameId;
    if (navigator.share) {
      try {
        await navigator.share({
          title: '살인자 게임 초대',
          text: `살인자 게임에 참여하세요! 입장 코드: ${game.gameId}`,
          url,
        });
      } catch {
        // Ignored
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Fallback
      }
    }
  };

  const handleModeChange = async (mode: GameMode) => {
    if (!isHost) return;
    await onUpdateMode(mode, roleMapping);
  };

  const handleRoleSelect = async (playerId: string, roleId: string) => {
    const updated = { ...roleMapping, [playerId]: roleId };
    setRoleMapping(updated);
    if (isHost) {
      await onUpdateMode(game.mode, updated);
    }
  };

  const handleBotDifficulty = async (difficulty: BotDifficulty) => {
    if (!isHost || isSubmitting) return;
    await onUpdateSettings({ botDifficulty: difficulty });
  };

  const difficulty = game.settings.botDifficulty || 'NORMAL';

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Room Code Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800 text-center space-y-3 shadow-2xl relative overflow-hidden">
        <div className="text-xs uppercase font-bold tracking-widest text-zinc-400">
          게임 입장 코드
        </div>
        <div className="text-4xl sm:text-5xl font-black font-mono tracking-widest text-red-500 drop-shadow-md select-all">
          {game.gameId}
        </div>

        <div className="flex items-center justify-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleCopyCode}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-xs font-bold text-zinc-200 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            {copied ? '코드 복사됨' : '코드 복사'}
          </button>
          <button
            type="button"
            onClick={handleShareLink}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-xs font-bold text-zinc-200 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Share2 className="w-4 h-4 text-blue-400" />
            초대 링크 공유
          </button>
        </div>

        {/* Participant counter */}
        <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-center gap-2">
          <Users className="w-4 h-4 text-zinc-400" />
          <span className="text-sm font-bold text-zinc-300">
            현재 참가자: <strong className="text-red-400 font-mono text-base">{playerCount}</strong> / 12명
          </span>
        </div>
      </div>

      {/* Mode Selection (HOST only or view only for others) */}
      <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Radio className="w-4 h-4 text-red-500" />
            역할 배정 방식 선택
          </h3>
          {!isHost && <span className="text-xs text-zinc-500">(방장 설정)</span>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Mode 1: Fixed */}
          <button
            type="button"
            disabled={!isHost || isSubmitting}
            onClick={() => handleModeChange('FIXED')}
            className={`p-4 rounded-xl border text-left transition-all ${
              game.mode === 'FIXED'
                ? 'bg-red-950/40 border-red-500 ring-2 ring-red-500/30 text-white'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
            } ${!isHost ? 'cursor-default' : 'cursor-pointer'}`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-sm text-white">MODE 1. 고정 역할 배정</span>
              {game.mode === 'FIXED' && <Check className="w-4 h-4 text-red-400" />}
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              12인의 역할을 슬롯 순서대로 고정 배정하거나 방장이 참가자별 역할을 직접 지정합니다.
            </p>
          </button>

          {/* Mode 2: Random */}
          <button
            type="button"
            disabled={!isHost || isSubmitting}
            onClick={() => handleModeChange('RANDOM')}
            className={`p-4 rounded-xl border text-left transition-all ${
              game.mode === 'RANDOM'
                ? 'bg-red-950/40 border-red-500 ring-2 ring-red-500/30 text-white'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
            } ${!isHost ? 'cursor-default' : 'cursor-pointer'}`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-sm text-white">MODE 2. 랜덤 역할 배정</span>
              {game.mode === 'RANDOM' && <Check className="w-4 h-4 text-red-400" />}
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              시민 6명, 살인마 진영 3명, 중립 3명 구성을 유지한 채 참가자들에게 역할을 무작위로 배정합니다.
            </p>
          </button>
        </div>
      </div>

      {/* Rule-based BOT intelligence */}
      <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Bot className="w-4 h-4 text-amber-400" />
              BOT 추리 난이도
            </h3>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              AI 연결 없이 규칙 기반으로 대화·의심·거짓말·특수능력을 수행합니다. 다른 플레이어의 비밀 역할은 읽지 않습니다.
            </p>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-zinc-950 border border-zinc-700 text-zinc-300 whitespace-nowrap">
            사람 {humanCount} · BOT {botCount}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {([
            ['EASY', '쉬움', '말수 적음 · 추리 실수 많음'],
            ['NORMAL', '보통', '모순 추적 · 자연스러운 의심'],
            ['HARD', '어려움', '기억·역질문·블러핑 강화'],
          ] as Array<[BotDifficulty, string, string]>).map(([value, label, desc]) => (
            <button
              key={value}
              type="button"
              disabled={!isHost || isSubmitting}
              onClick={() => handleBotDifficulty(value)}
              className={`p-3 rounded-xl border text-left transition-all ${
                difficulty === value
                  ? 'bg-amber-950/50 border-amber-500 ring-1 ring-amber-500/40'
                  : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
              } ${!isHost ? 'cursor-default' : 'cursor-pointer'}`}
            >
              <div className={`text-xs font-black ${difficulty === value ? 'text-amber-300' : 'text-zinc-200'}`}>
                {label}
              </div>
              <div className="text-[10px] text-zinc-500 mt-1 leading-snug">{desc}</div>
            </button>
          ))}
        </div>

        {isHost && !isFull && (
          <button
            type="button"
            onClick={onFillBots}
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-[0.99] text-white text-sm font-black transition-all flex items-center justify-center gap-2"
          >
            <Bot className="w-4 h-4" />
            빈자리 BOT으로 채우기 ({12 - playerCount}자리)
          </button>
        )}
        {!isHost && (
          <div className="text-center text-[11px] text-zinc-500">BOT 난이도는 방장이 설정합니다.</div>
        )}
      </div>

      {/* 12 Players Slots Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" />
            참가자 슬롯 ({playerCount} / 12)
          </h3>


        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {Array.from({ length: 12 }).map((_, index) => {
            const player: Player | undefined = game.players[index];
            const preset = FIXED_ROLES_PRESET[index];

            if (player) {
              const isSelf = player.id === currentUserId;
              const assignedRoleId = roleMapping[player.id] || preset?.roleId || 'citizen';
              const assignedRole = ROLES_DATA[assignedRoleId];

              return (
                <div
                  key={player.id}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                    isSelf
                      ? 'bg-zinc-900 border-zinc-600 ring-1 ring-zinc-500'
                      : 'bg-zinc-900/70 border-zinc-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-zinc-800 flex items-center justify-center font-mono font-bold text-xs text-zinc-400">
                      {String(index + 1).padStart(2, '0')}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-white">{player.nickname}</span>
                        {player.isHost && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 text-[10px] font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            <Crown className="w-2.5 h-2.5" /> HOST
                          </span>
                        )}
                        {isSelf && (
                          <span className="px-1.5 py-0.2 text-[10px] font-bold rounded bg-blue-600 text-white">
                            나
                          </span>
                        )}
                        {player.isBot && (
                          <span className="text-[10px] text-zinc-500 font-mono">(BOT)</span>
                        )}
                      </div>

                      {/* Fixed role mapping selector for Host */}
                      {game.mode === 'FIXED' && isHost && (
                        <div className="mt-1">
                          <select
                            value={assignedRoleId}
                            onChange={(e) => handleRoleSelect(player.id, e.target.value)}
                            className="bg-zinc-800 text-zinc-200 text-xs px-2 py-0.5 rounded border border-zinc-700 focus:outline-none"
                          >
                            {FIXED_ROLES_PRESET.map((p) => (
                              <option key={p.roleId} value={p.roleId}>
                                {p.roleName} ({ROLES_DATA[p.roleId]?.teamName})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {game.mode === 'FIXED' && !isHost && preset && (
                        <div className="text-[11px] text-zinc-500 font-medium mt-0.5">
                          기본 배정: {preset.roleName}
                        </div>
                      )}
                    </div>
                  </div>

                  <span className="text-xs text-emerald-400 font-semibold px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/40">
                    준비 완료
                  </span>
                </div>
              );
            }

            // Empty Slot
            return (
              <div
                key={`empty-${index}`}
                className="p-3.5 rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 flex items-center justify-between opacity-60"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-zinc-900 flex items-center justify-center font-mono text-xs text-zinc-600">
                    {String(index + 1).padStart(2, '0')}
                  </div>
                  <span className="text-xs text-zinc-500 font-medium">참가자 대기 중...</span>
                </div>

                {game.mode === 'FIXED' && preset && (
                  <span className="text-[11px] text-zinc-600 font-mono">
                    {preset.roleName}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Start Game Action — 12명 모이면 자동 시작 */}
      <div className="pt-2">
        {isFull ? (
          <div className="p-5 rounded-2xl bg-red-950/30 border border-red-800/60 text-center space-y-3">
            <div className="text-xs font-bold text-red-300 tracking-widest">12 / 12 READY</div>
            <div className="text-4xl font-black font-mono text-white">
              {autoStartSeconds ?? 10}
            </div>
            <div className="text-sm font-black text-white">초 후 게임이 자동으로 시작됩니다</div>
            <p className="text-xs text-zinc-400">방장이 아무것도 누르지 않아도 시작됩니다. 시작되면 각자 자기 역할 카드가 자동으로 뜹니다.</p>
            {isHost && (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={onStartGame}
                className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-sm active:scale-[0.98] transition-all"
              >
                지금 바로 시작
              </button>
            )}
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-center space-y-1">
            <div className="text-sm font-bold text-zinc-200">친구들을 기다리는 중입니다 ({playerCount}/12)</div>
            <div className="text-xs text-zinc-400">12명이 모두 들어오면 10초 카운트다운 후 자동 시작됩니다.</div>
          </div>
        )}
      </div>
    </div>
  );
};
