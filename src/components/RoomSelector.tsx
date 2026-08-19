import React, { useState } from 'react';
import { RoomId, Player, GameState } from '../types';
import { ALL_ROOMS } from '../rolesData';
import {
  MapPin,
  Check,
  Lock,
  Ticket,
  Sparkles,
  Dice5,
  EyeOff,
  AlertOctagon,
  HelpCircle,
  Clock,
  Shield,
  Layers,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface RoomSelectorProps {
  game: GameState;
  currentPlayer: Player;
  onDrawRoom: (usePass: boolean, designatedRoom?: RoomId) => void;
  onSelectRoom: (room: RoomId, confirm: boolean, usePass?: boolean) => void;
  onUsePrisonPass: () => void;
  isSubmitting: boolean;
}

const ROOM_THEMES: Record<RoomId, { name: string; subtitle: string; color: string; desc: string; iconBg: string }> = {
  A: {
    name: 'A ROOM',
    subtitle: '중앙 통로',
    color: 'border-amber-600/70 bg-gradient-to-b from-amber-950/40 via-zinc-900 to-zinc-950 text-amber-300',
    desc: '많은 인원이 오가는 중앙 구역. 도주로가 넓지만 발소리가 울립니다.',
    iconBg: 'bg-amber-950/80 text-amber-400 border-amber-800/50',
  },
  B: {
    name: 'B ROOM',
    subtitle: '의무 연구실',
    color: 'border-emerald-600/70 bg-gradient-to-b from-emerald-950/40 via-zinc-900 to-zinc-950 text-emerald-300',
    desc: '약품 캐비닛과 실험 도구가 있는 밀실. 조용하고 차폐율이 높습니다.',
    iconBg: 'bg-emerald-950/80 text-emerald-400 border-emerald-800/50',
  },
  C: {
    name: 'C ROOM',
    subtitle: '보안 통제실',
    color: 'border-blue-600/70 bg-gradient-to-b from-blue-950/40 via-zinc-900 to-zinc-950 text-blue-300',
    desc: '감시 콘솔과 비상 셔터 스위치가 있는 통제 센터입니다.',
    iconBg: 'bg-blue-950/80 text-blue-400 border-blue-800/50',
  },
  D: {
    name: 'D ROOM',
    subtitle: '기록 보관소',
    color: 'border-indigo-600/70 bg-gradient-to-b from-indigo-950/40 via-zinc-900 to-zinc-950 text-indigo-300',
    desc: '낡은 서류 철과 서가로 가득 찬 미로 형태의 좁은 공간입니다.',
    iconBg: 'bg-indigo-950/80 text-indigo-400 border-indigo-800/50',
  },
  E: {
    name: 'E ROOM',
    subtitle: '기계 시설실',
    color: 'border-orange-600/70 bg-gradient-to-b from-orange-950/40 via-zinc-900 to-zinc-950 text-orange-300',
    desc: '소음이 심한 발전기와 환풍기가 돌아가며 비명이 묻히기 쉽습니다.',
    iconBg: 'bg-orange-950/80 text-orange-400 border-orange-800/50',
  },
  F: {
    name: 'F ROOM',
    subtitle: '폐쇄 창고',
    color: 'border-red-600/70 bg-gradient-to-b from-red-950/40 via-zinc-900 to-zinc-950 text-red-300',
    desc: '조명이 꺼져 어둡고 먼지가 쌓인 외딴 지하 보관소입니다.',
    iconBg: 'bg-red-950/80 text-red-400 border-red-800/50',
  },
};

export const RoomSelector: React.FC<RoomSelectorProps> = ({
  game,
  currentPlayer,
  onDrawRoom,
  onSelectRoom,
  onUsePrisonPass,
  isSubmitting,
}) => {
  const isAlive = currentPlayer.status === 'ALIVE';
  const isSelectionPhase = game.phase === 'ROOM_SELECTION' || game.phase === 'ROOM_DRAW';
  const isImprisoned = currentPlayer.currentRoom === 'PRISON';

  const [usePassMode, setUsePassMode] = useState<boolean>(false);
  const [selectedPassRoom, setSelectedPassRoom] = useState<RoomId | null>(null);
  const [isFlipping, setIsFlipping] = useState<boolean>(false);

  const roomPassCount = currentPlayer.inventory?.roomPassCount || 0;
  const prisonPassCount = currentPlayer.inventory?.prisonPassCount || 0;

  // Candidates generated for the player
  const candidateRooms: RoomId[] = currentPlayer.randomRoomOptions || ['A', 'B'];
  const hasRevealed = currentPlayer.isRoomRevealed || !!currentPlayer.randomRoomOptions;
  const isConfirmed = !!(currentPlayer.confirmedRoom || currentPlayer.roomConfirmed);
  const chosenRoom = currentPlayer.selectedRoom || currentPlayer.currentRoom;

  // Confirmation progress count
  const alivePlayers = game.players.filter((p) => p.status === 'ALIVE');
  const confirmedCount = alivePlayers.filter((p) => p.confirmedRoom || p.roomConfirmed).length;
  const totalAlive = alivePlayers.length;

  const handleFlipToReveal = () => {
    if (isSubmitting) return;
    setIsFlipping(true);
    setTimeout(() => {
      onDrawRoom(false);
      setIsFlipping(false);
    }, 450);
  };

  const handlePickCandidate = (room: RoomId) => {
    if (isConfirmed || isSubmitting) return;
    onSelectRoom(room, false);
  };

  const handleConfirmSelection = () => {
    if (!chosenRoom || isConfirmed || isSubmitting) return;
    onSelectRoom(chosenRoom, true);
  };

  const handleConfirmPassSelection = () => {
    if (!selectedPassRoom || isConfirmed || isSubmitting) return;
    onSelectRoom(selectedPassRoom, true, true);
  };

  return (
    <div className="w-full space-y-4" id="room-selection-container">
      {/* 1. Prison State Notification */}
      {isImprisoned && (
        <div className="p-5 rounded-3xl bg-zinc-950 border border-red-900/80 space-y-3 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-red-950 text-red-400 border border-red-800/60">
              <AlertOctagon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-red-300">교도관에 의해 감옥에 수감되었습니다</h3>
              <p className="text-xs text-zinc-400">
                이번 라운드 일반 A~F 방 배정에서 제외되어 감옥(PRISON)에 격리됩니다.
              </p>
            </div>
          </div>

          {prisonPassCount > 0 && (
            <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
              <div className="text-xs text-amber-300 flex items-center gap-1.5 font-bold">
                <Ticket className="w-4 h-4" /> 보유 탈옥권: {prisonPassCount}장
              </div>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={onUsePrisonPass}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs rounded-xl transition-all shadow-md"
              >
                탈옥권 사용 (감옥 해제)
              </button>
            </div>
          )}
        </div>
      )}

      {/* 2. Active Alive Room Selection */}
      {isAlive && !isImprisoned && isSelectionPhase && (
        <div className="space-y-4">
          {/* Header Progress & Status Bar */}
          <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs font-bold text-white tracking-wide">
                ROUND {String(game.round).padStart(2, '0')} 방 배정 단계
              </span>
            </div>
            <div className="text-xs font-mono font-bold text-zinc-300 flex items-center gap-1 bg-zinc-800 px-3 py-1 rounded-full border border-zinc-700">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>
                선택 완료: <strong className="text-emerald-400">{confirmedCount}</strong> / {totalAlive}명
              </span>
            </div>
          </div>

          {/* Toggle Pass / Regular Mode */}
          {roomPassCount > 0 && !isConfirmed && (
            <div className="p-1 rounded-2xl bg-zinc-900 border border-zinc-800 flex gap-1">
              <button
                type="button"
                onClick={() => setUsePassMode(false)}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                  !usePassMode
                    ? 'bg-zinc-800 text-white shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Dice5 className="w-4 h-4 text-red-400" />
                랜덤 후보 2개 중 선택
              </button>
              <button
                type="button"
                onClick={() => setUsePassMode(true)}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                  usePassMode
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Ticket className="w-4 h-4 text-amber-300" />
                방 지정권 사용 ({roomPassCount}장 보유)
              </button>
            </div>
          )}

          {/* CASE A: ALREADY CONFIRMED */}
          {isConfirmed && chosenRoom ? (
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="p-6 rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border-2 border-emerald-500/60 text-center space-y-4 shadow-2xl relative overflow-hidden"
            >
              <div className="inline-flex p-3.5 rounded-2xl bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 shadow-lg">
                <Check className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <span className="text-xs font-bold text-emerald-400 tracking-wider uppercase">
                  ✓ 방 선택 확정 완료
                </span>
                <div className="text-4xl font-black font-mono text-white tracking-widest">
                  #{chosenRoom} ROOM
                </div>
                <div className="text-sm font-bold text-zinc-300">
                  {ROOM_THEMES[chosenRoom as RoomId]?.subtitle || '밀실'}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-zinc-950/80 border border-zinc-800 text-xs text-zinc-300 space-y-1">
                <div className="flex items-center justify-center gap-1.5 font-bold text-amber-300">
                  <Sparkles className="w-4 h-4" />
                  다른 참가자들이 방을 선택하고 있습니다...
                </div>
                <div className="text-[11px] text-zinc-400">
                  모든 참가자({confirmedCount}/{totalAlive}명)가 선택을 확정하면 즉시 특수능력 선택 단계로 전환됩니다.
                </div>
              </div>

              <p className="text-[11px] text-zinc-500 flex items-center justify-center gap-1">
                <EyeOff className="w-3.5 h-3.5" />
                선택한 방 위치는 본인에게만 보여지며, 다른 사람에게는 절대 노출되지 않습니다.
              </p>
            </motion.div>
          ) : !usePassMode ? (
            /* CASE B: 2 CANDIDATE SELECTION */
            <div className="p-6 rounded-3xl bg-zinc-900/90 border border-zinc-800 space-y-5 shadow-xl">
              <div className="text-center space-y-1.5">
                <h3 className="text-xl font-black text-white tracking-tight flex items-center justify-center gap-2">
                  <Layers className="w-5 h-5 text-amber-400" />
                  <span>이번 라운드의 방 후보 2개</span>
                </h3>
                <p className="text-xs text-zinc-400">
                  시스템이 무작위로 추첨한 2개의 방 중 <strong className="text-white">이동할 1개의 방</strong>을 선택하세요.
                </p>
              </div>

              {/* 2 Candidate Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {candidateRooms.map((roomId) => {
                  const theme = ROOM_THEMES[roomId] || ROOM_THEMES.A;
                  const isSelected = chosenRoom === roomId;

                  return (
                    <motion.button
                      key={roomId}
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handlePickCandidate(roomId)}
                      className={`p-5 rounded-2xl border-2 text-left transition-all relative overflow-hidden cursor-pointer ${
                        isSelected
                          ? `${theme.color} ring-2 ring-amber-400/80 shadow-xl shadow-amber-950/40`
                          : 'bg-zinc-850 border-zinc-700/80 hover:border-zinc-500 hover:bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                            후보 구역
                          </span>
                          <div className="text-3xl font-black font-mono text-white tracking-wider">
                            {roomId} ROOM
                          </div>
                          <div className="text-xs font-bold text-amber-300">{theme.subtitle}</div>
                        </div>

                        <div
                          className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
                            isSelected
                              ? 'bg-amber-500 border-amber-400 text-zinc-950'
                              : 'border-zinc-600 bg-zinc-800 text-transparent'
                          }`}
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                        </div>
                      </div>

                      <p className="mt-3 text-[11px] text-zinc-400 leading-relaxed">
                        {theme.desc}
                      </p>

                      {isSelected && (
                        <div className="mt-2.5 pt-2 border-t border-amber-500/30 flex items-center gap-1 text-[11px] font-bold text-amber-300">
                          <Check className="w-3.5 h-3.5" /> 선택된 방
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* Confirm Button */}
              <div className="pt-2">
                <button
                  type="button"
                  disabled={!chosenRoom || isSubmitting}
                  onClick={handleConfirmSelection}
                  className={`w-full py-4 rounded-2xl font-bold text-base shadow-xl transition-all flex items-center justify-center gap-2 ${
                    chosenRoom
                      ? 'bg-amber-500 hover:bg-amber-600 active:scale-98 text-zinc-950 shadow-amber-950/60 cursor-pointer'
                      : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700/60'
                  }`}
                >
                  <Check className="w-5 h-5" />
                  <span>
                    {chosenRoom
                      ? `[${chosenRoom} ROOM] 선택 확정하기 (변경 불가)`
                      : '두 방 중 하나를 선택해주세요'}
                  </span>
                </button>
              </div>

              <div className="text-center text-[11px] text-zinc-500">
                ※ 선택 확정 후에는 취소하거나 다른 방으로 변경할 수 없습니다.
              </div>
            </div>
          ) : (
            /* CASE C: ROOM PASS SELECTION */
            <div className="p-5 rounded-3xl bg-zinc-900/90 border border-amber-800/60 space-y-4 shadow-xl">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-amber-400 flex items-center gap-2">
                  <Ticket className="w-5 h-5" /> 방 지정권 사용
                </h3>
                <p className="text-xs text-zinc-300">
                  원하는 A~F 방을 직접 선택하십시오 (방 지정권 1장 소멸).
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {ALL_ROOMS.map((roomId) => {
                  const isSelected = selectedPassRoom === roomId;
                  return (
                    <button
                      key={roomId}
                      type="button"
                      onClick={() => setSelectedPassRoom(roomId)}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-950/80 border-amber-500 ring-2 ring-amber-500/50 text-white'
                          : 'bg-zinc-850 border-zinc-750 hover:border-zinc-600 text-zinc-300'
                      }`}
                    >
                      <div className="text-2xl font-black font-mono text-white">{roomId}</div>
                      <div className="text-[11px] text-zinc-400">{ROOM_THEMES[roomId]?.subtitle}</div>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                disabled={!selectedPassRoom || isSubmitting}
                onClick={handleConfirmPassSelection}
                className="w-full py-3.5 rounded-2xl bg-amber-600 hover:bg-amber-700 active:scale-98 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <Ticket className="w-4 h-4" />
                <span>
                  {selectedPassRoom
                    ? `[${selectedPassRoom} ROOM] 방 지정권으로 확정하기`
                    : '지정할 방을 선택해주세요'}
                </span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
