import React, { useState } from 'react';
import { GameState, Player, RoomId, PlayerStatus, TeamType, GameSettings } from '../types';
import { ALL_ROOMS, getTeamColor, ROLES_DATA } from '../rolesData';
import {
  Crown,
  Play,
  Pause,
  FastForward,
  CheckCircle2,
  Skull,
  Lock,
  Heart,
  Settings,
  Trophy,
  AlertTriangle,
  MapPin,
  Users,
  Sparkles,
  RefreshCcw,
  MessageSquare,
} from 'lucide-react';

interface HostDashboardProps {
  game: GameState;
  onResolveRound: () => Promise<void>;
  onNextRound: () => Promise<void>;
  onSkipDiscussion?: () => Promise<void>;
  onTogglePause: () => Promise<void>;
  onUpdatePlayer: (
    targetPlayerId: string,
    newStatus?: PlayerStatus,
    newRoom?: RoomId
  ) => Promise<void>;
  onEndGame: (winner: TeamType, winnerReason: string) => Promise<void>;
  onRestartGame: () => Promise<void>;
  onUpdateSettings: (settings: Partial<GameSettings>) => Promise<void>;
  isSubmitting: boolean;
}

export const HostDashboard: React.FC<HostDashboardProps> = ({
  game,
  onResolveRound,
  onNextRound,
  onSkipDiscussion,
  onTogglePause,
  onUpdatePlayer,
  onEndGame,
  onRestartGame,
  onUpdateSettings,
  isSubmitting,
}) => {
  const [selectedPlayerForEdit, setSelectedPlayerForEdit] = useState<Player | null>(null);
  const [showEndGameModal, setShowEndGameModal] = useState(false);
  const [endGameWinner, setEndGameWinner] = useState<TeamType>('citizen');
  const [endGameReason, setEndGameReason] = useState('');
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Settings local state
  const [settingsForm, setSettingsForm] = useState<GameSettings>({ ...game.settings });

  const aliveCount = game.players.filter((p) => p.status === 'ALIVE').length;
  const confirmedCount = game.players.filter(
    (p) => p.status === 'ALIVE' && p.confirmedRoom
  ).length;

  const handleOpenPlayerEdit = (player: Player) => {
    setSelectedPlayerForEdit(player);
  };

  const handleStatusChange = async (status: PlayerStatus) => {
    if (!selectedPlayerForEdit) return;
    await onUpdatePlayer(selectedPlayerForEdit.id, status, undefined);
    setSelectedPlayerForEdit(null);
  };

  const handleRoomChange = async (room: RoomId) => {
    if (!selectedPlayerForEdit) return;
    await onUpdatePlayer(selectedPlayerForEdit.id, undefined, room);
    setSelectedPlayerForEdit(null);
  };

  const handleExecuteEndGame = async () => {
    await onEndGame(endGameWinner, endGameReason || '방장 수동 판정');
    setShowEndGameModal(false);
  };

  const handleSaveSettings = async () => {
    await onUpdateSettings(settingsForm);
    setShowSettingsModal(false);
  };

  return (
    <div className="w-full space-y-6">
      {/* Host Banner */}
      <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-800/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-900/60 border border-amber-600/60 text-amber-300">
            <Crown className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              HOST 관리자 마스터 패널
            </div>
            <h2 className="text-lg font-black text-white">진행 관리자 패널 (비밀정보 비공개)</h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
          >
            <Settings className="w-4 h-4" /> 규칙 설정
          </button>
          <button
            type="button"
            onClick={onTogglePause}
            disabled={isSubmitting}
            className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              game.status === 'PAUSED'
                ? 'bg-emerald-600 border-emerald-500 text-white animate-pulse'
                : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-300'
            }`}
          >
            {game.status === 'PAUSED' ? (
              <>
                <Play className="w-3.5 h-3.5" /> 게임 재개
              </>
            ) : (
              <>
                <Pause className="w-3.5 h-3.5" /> 일시정지
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Flow Controls */}
      <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FastForward className="w-4 h-4 text-red-500" />
              자동 진행 중
            </h3>
            <p className="mt-1 text-xs text-zinc-400">
              대화 → 방 선택 → 특수능력 → 낮 결과 → 다음 라운드 순서로 서버가 자동 전환합니다.
            </p>
          </div>
          <span className="text-xs font-mono text-zinc-400 flex-shrink-0">
            선택 확정: {confirmedCount} / {aliveCount}명
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {game.phase === 'PRE_SELECTION_DISCUSSION' && (
            <button
              type="button"
              onClick={onSkipDiscussion}
              disabled={isSubmitting}
              className="py-3.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white font-bold text-sm transition-all shadow-lg shadow-amber-950 flex items-center justify-center gap-2 cursor-pointer"
            >
              <FastForward className="w-4 h-4" />
              대화만 조기 종료 → 방 선택
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowEndGameModal(true)}
            className="py-3.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-yellow-400 font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Trophy className="w-4 h-4" />
            강제 승리 판정
          </button>
        </div>
      </div>

      {/* Privacy-safe room selection progress */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-red-400" />
          방 선택 진행 현황
        </h3>
        <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
          <p className="text-xs text-zinc-400 leading-relaxed mb-3">
            방장도 실제 플레이어이므로 다른 참가자의 방 후보·선택 방·역할은 공개하지 않습니다.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {game.players.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800">
                <span className="text-xs font-semibold text-zinc-200">{p.nickname}</span>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                  p.status !== 'ALIVE'
                    ? 'bg-zinc-800 text-zinc-500'
                    : p.confirmedRoom || p.roomConfirmed
                    ? 'bg-emerald-950 text-emerald-400'
                    : 'bg-amber-950 text-amber-400'
                }`}>
                  {p.status !== 'ALIVE' ? p.status : p.confirmedRoom || p.roomConfirmed ? '선택 완료' : '선택 중'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Player status management */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-400" />
          전체 플레이어 상태 관리 (역할/방 비공개)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {game.players.map((p) => {
            const role = null;
            const style = null;

            return (
              <div
                key={p.id}
                onClick={() => handleOpenPlayerEdit(p)}
                className={`p-3.5 rounded-2xl border cursor-pointer hover:scale-[1.01] transition-all flex items-center justify-between ${
                  p.status === 'DEAD'
                    ? 'bg-red-950/20 border-red-900/40 opacity-70'
                    : p.status === 'REMOVED'
                    ? 'bg-amber-950/20 border-amber-900/40 opacity-80'
                    : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                      p.status === 'DEAD'
                        ? 'bg-red-900/60 text-red-300'
                        : p.status === 'REMOVED'
                        ? 'bg-amber-900/60 text-amber-300'
                        : 'bg-zinc-800 text-zinc-200'
                    }`}
                  >
                    {p.status === 'DEAD' ? (
                      <Skull className="w-4 h-4" />
                    ) : p.status === 'REMOVED' ? (
                      <Lock className="w-4 h-4" />
                    ) : (
                      <Heart className="w-4 h-4 text-emerald-400" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-white">{p.nickname}</span>
                      {p.isHost && (
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1 py-0.2 rounded font-bold">
                          HOST
                        </span>
                      )}
                    </div>
                    {role && style && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-xs font-bold ${style.text}`}>{role.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${style.badge}`}>
                          {role.teamName}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-zinc-300">
                    {p.status === 'ALIVE' ? (p.confirmedRoom || p.roomConfirmed ? '방 선택 완료' : '대기/선택 중') : '행동 불가'}
                  </div>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                      p.status === 'ALIVE'
                        ? 'bg-emerald-950 text-emerald-400'
                        : p.status === 'DEAD'
                        ? 'bg-red-950 text-red-400'
                        : 'bg-amber-950 text-amber-400'
                    }`}
                  >
                    {p.status === 'ALIVE' ? '생존' : p.status === 'DEAD' ? '사망' : '체포'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit Player Modal */}
      {selectedPlayerForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-3xl p-6 space-y-5 shadow-2xl text-zinc-100">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-white">
                  [{selectedPlayerForEdit.nickname}] 상태 관리
                </h3>
                <span className="text-xs text-zinc-400">
                  역할: {selectedPlayerForEdit.roleId ? ROLES_DATA[selectedPlayerForEdit.roleId]?.name : '미배정'}
                </span>
              </div>
              <button
                onClick={() => setSelectedPlayerForEdit(null)}
                className="text-zinc-400 hover:text-white text-xs font-bold cursor-pointer"
              >
                닫기
              </button>
            </div>

            {/* Status Modifiers */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400">생존 상태 변경</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleStatusChange('ALIVE')}
                  className={`py-2 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                    selectedPlayerForEdit.status === 'ALIVE'
                      ? 'bg-emerald-600 text-white border-emerald-500'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  <Heart className="w-3.5 h-3.5" /> 생존
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange('DEAD')}
                  className={`py-2 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                    selectedPlayerForEdit.status === 'DEAD'
                      ? 'bg-red-600 text-white border-red-500'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  <Skull className="w-3.5 h-3.5" /> 사망
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange('REMOVED')}
                  className={`py-2 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                    selectedPlayerForEdit.status === 'REMOVED'
                      ? 'bg-amber-600 text-white border-amber-500'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" /> 제외 (체포)
                </button>
              </div>
            </div>

            {/* Room Modifiers */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400">강제 방 이동</label>
              <div className="grid grid-cols-3 gap-2">
                {ALL_ROOMS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleRoomChange(r)}
                    className={`py-2 rounded-xl text-xs font-bold font-mono border transition-colors cursor-pointer ${
                      selectedPlayerForEdit.currentRoom === r ||
                      selectedPlayerForEdit.selectedRoom === r
                        ? 'bg-red-600 text-white border-red-500'
                        : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    {r} ROOM
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* End Game Modal */}
      {showEndGameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 animate-fadeIn">
          <div className="w-full max-w-md bg-zinc-950 border-2 border-yellow-600/80 rounded-3xl p-6 space-y-4 shadow-2xl text-zinc-100">
            <div className="flex items-center gap-2 pb-3 border-b border-zinc-800">
              <Trophy className="w-6 h-6 text-yellow-500" />
              <h3 className="text-lg font-bold text-white">게임 종료 및 승리 판정</h3>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400">승리 진영 선택</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setEndGameWinner('citizen')}
                  className={`py-3 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                    endGameWinner === 'citizen'
                      ? 'bg-blue-600 text-white border-blue-400'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-300'
                  }`}
                >
                  시민 진영 승리
                </button>
                <button
                  type="button"
                  onClick={() => setEndGameWinner('killer')}
                  className={`py-3 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                    endGameWinner === 'killer'
                      ? 'bg-red-600 text-white border-red-400'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-300'
                  }`}
                >
                  살인마 진영 승리
                </button>
                <button
                  type="button"
                  onClick={() => setEndGameWinner('neutral')}
                  className={`py-3 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                    endGameWinner === 'neutral'
                      ? 'bg-purple-600 text-white border-purple-400'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-300'
                  }`}
                >
                  중립 진영 승리
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400">승리 사유 입력 (선택)</label>
              <input
                type="text"
                value={endGameReason}
                onChange={(e) => setEndGameReason(e.target.value)}
                placeholder="예: 경찰의 살인마 검거 성공 / 생존 조건 달성"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-xs focus:outline-none focus:border-yellow-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowEndGameModal(false)}
                className="py-3 rounded-xl bg-zinc-800 text-zinc-300 font-bold text-sm cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleExecuteEndGame}
                className="py-3 rounded-xl bg-yellow-600 hover:bg-yellow-700 text-white font-bold text-sm transition-colors cursor-pointer"
              >
                종료 확정
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 animate-fadeIn">
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-6 space-y-4 shadow-2xl text-zinc-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-red-500" />
                <h3 className="text-base font-bold text-white">게임 규칙 및 시간 설정</h3>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-zinc-400 hover:text-white text-xs font-bold cursor-pointer"
              >
                닫기
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-zinc-300 block mb-1">사전 대화 시간 (초)</label>
                  <input
                    type="number"
                    min={10}
                    max={300}
                    value={settingsForm.preDiscussionTimeSeconds}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, preDiscussionTimeSeconds: Number(e.target.value) || 60 })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-zinc-300 block mb-1">방 선택 제한 시간 (초)</label>
                  <input
                    type="number"
                    min={5}
                    max={60}
                    value={settingsForm.roomSelectionTimeSeconds}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, roomSelectionTimeSeconds: Number(e.target.value) || 15 })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-zinc-300 block mb-1">최대 라운드 수</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={settingsForm.maxRounds}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, maxRounds: Number(e.target.value) || 10 })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-white"
                />
              </div>

              <div>
                <label className="font-bold text-zinc-300 block mb-1">시민 진영 승리 조건 문구</label>
                <input
                  type="text"
                  value={settingsForm.citizenWinConditionText}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, citizenWinConditionText: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-white"
                />
              </div>

              <div>
                <label className="font-bold text-zinc-300 block mb-1">살인마 진영 승리 조건 문구</label>
                <input
                  type="text"
                  value={settingsForm.killerWinConditionText}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, killerWinConditionText: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-white"
                />
              </div>

              <div>
                <label className="font-bold text-zinc-300 block mb-1">중립 진영 승리 조건 문구</label>
                <input
                  type="text"
                  value={settingsForm.neutralWinConditionText}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, neutralWinConditionText: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="py-2.5 rounded-xl bg-zinc-800 text-zinc-300 font-bold text-xs cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSaveSettings}
                className="py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                설정 저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
