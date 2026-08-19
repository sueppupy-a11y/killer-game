import React, { useState } from 'react';
import { GameState, Player, RoomId } from '../types';
import { ALL_ROOMS } from '../rolesData';
import {
  Sun,
  MapPin,
  Shield,
  Eye,
  FileText,
  Users,
  MessageSquare,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Info,
  Lock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DayPhaseProps {
  game: GameState;
  currentPlayer: Player;
  onGoToDiscussion?: () => void;
  onSelectTab?: (tab: 'hub' | 'players' | 'logs') => void;
  isHost: boolean;
  isSubmitting: boolean;
}

const ROOM_THEMES: Record<RoomId, { name: string; subtitle: string; color: string; desc: string }> = {
  A: { name: 'A ROOM', subtitle: '중앙 통로', color: 'from-amber-950/50 to-zinc-900 border-amber-800/40 text-amber-300', desc: '넓은 복도로 도주로가 많지만 발소리가 울리는 곳' },
  B: { name: 'B ROOM', subtitle: '의무 연구실', color: 'from-emerald-950/50 to-zinc-900 border-emerald-800/40 text-emerald-300', desc: '의료 장비와 약품 캐비닛이 구비된 폐쇄 연구구역' },
  C: { name: 'C ROOM', subtitle: '보안 통제실', color: 'from-blue-950/50 to-zinc-900 border-blue-800/40 text-blue-300', desc: 'CCTV 모니터와 비상 셔터 스위치가 있는 통제 구역' },
  D: { name: 'D ROOM', subtitle: '기록 보관소', color: 'from-indigo-950/50 to-zinc-900 border-indigo-800/40 text-indigo-300', desc: '오래된 문서 철과 철제 책장이 가득한 미로 같은 공간' },
  E: { name: 'E ROOM', subtitle: '기계 시설실', color: 'from-orange-950/50 to-zinc-900 border-orange-800/40 text-orange-300', desc: '발전기와 배관 소음으로 주변 소리가 차단되는 시설' },
  F: { name: 'F ROOM', subtitle: '폐쇄 창고', color: 'from-red-950/50 to-zinc-900 border-red-800/40 text-red-300', desc: '조명이 거의 닿지 않는 어둡고 고립된 지하 격납 창고' },
};

export const DayPhase: React.FC<DayPhaseProps> = ({
  game,
  currentPlayer,
  onGoToDiscussion,
  onSelectTab,
  isHost,
  isSubmitting,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  const myRoom = currentPlayer.currentRoom || currentPlayer.selectedRoom;
  const isPrison = myRoom === 'PRISON';
  const role = currentPlayer.role;
  const isAlive = currentPlayer.status === 'ALIVE';

  const psychicCount = currentPlayer.extrasensoryRoomCount;
  const witnessClues = currentPlayer.witnessClues || [];
  const forensicClues = currentPlayer.forensicClues || [];
  const policeAlert = currentPlayer.policeAttackedAlert;

  const aliveCount = game.players.filter((p) => p.status === 'ALIVE').length;
  const deadCount = game.players.filter((p) => p.status === 'DEAD').length;
  const removedCount = game.players.filter((p) => p.status === 'REMOVED').length;

  return (
    <div className="w-full space-y-5" id="day-phase-container">
      {/* 1. Header Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-3xl bg-gradient-to-br from-amber-950/40 via-zinc-900 to-zinc-950 border border-amber-800/50 text-center space-y-3 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
          <Sun className="w-32 h-32 text-amber-400" />
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-950/80 border border-amber-700/60 text-amber-300 text-xs font-black tracking-wider uppercase">
          <Sun className="w-3.5 h-3.5 animate-spin-slow" />
          <span>ROUND {String(game.round).padStart(2, '0')} — DAY PHASE</span>
        </div>

        <div className="space-y-1">
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center justify-center gap-2">
            <span>☀️ 낮이 되었습니다.</span>
          </h2>
          <p className="text-xs text-amber-200/80">
            모든 플레이어의 방 이동 및 정산이 완료되었습니다.
          </p>
        </div>

        {/* 2. My Room Card */}
        <div className="mt-4 p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800 text-center space-y-2 relative">
          <span className="text-xs font-semibold text-zinc-400">당신이 선택한 방</span>
          {isPrison ? (
            <div className="space-y-1">
              <div className="text-3xl font-black font-mono text-red-400 flex items-center justify-center gap-2">
                <Lock className="w-6 h-6" /> PRISON (감옥)
              </div>
              <p className="text-xs text-zinc-400">교도관의 조치로 감옥에 격리되었습니다.</p>
            </div>
          ) : myRoom ? (
            <div className="space-y-1">
              <div className="text-4xl font-black font-mono text-white tracking-wider">
                {myRoom} ROOM
              </div>
              <div className="text-xs font-bold text-amber-300">
                {ROOM_THEMES[myRoom as RoomId]?.subtitle || '밀실'}
              </div>
              <p className="text-[11px] text-zinc-400 max-w-sm mx-auto">
                {ROOM_THEMES[myRoom as RoomId]?.desc}
              </p>
            </div>
          ) : (
            <div className="text-xl font-bold text-zinc-400">배정 정보 없음</div>
          )}

          <div className="pt-2 text-[11px] text-zinc-500">
            ※ 이 방 정보는 본인에게만 공개됩니다. 다른 플레이어와의 토론에서 진실 혹은 블러핑을 선택하세요.
          </div>
        </div>
      </motion.div>

      {/* 3. Role Clues & Alerts Received This Day */}
      <AnimatePresence>
        {/* Police Attack Alert */}
        {policeAlert && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 rounded-2xl bg-red-950/70 border border-red-700/80 text-red-200 space-y-1 shadow-lg"
          >
            <div className="flex items-center gap-2 font-bold text-sm text-red-300">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <span>[비밀 경보] 살인마의 습격 감지!</span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              이번 라운드에 살인마가 당신과 같은 방에 진입하여 흉기로 습격했으나, 경찰의 방어권으로 무사히 살아남았습니다!
            </p>
          </motion.div>
        )}

        {/* Psychic Extrasensory Count */}
        {role?.id === 'psychic' && psychicCount !== null && psychicCount !== undefined && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 rounded-2xl bg-purple-950/50 border border-purple-800/60 text-purple-200 space-y-1 shadow-lg"
          >
            <div className="flex items-center gap-2 font-bold text-sm text-purple-300">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <span>[초감각 발동] 이번 라운드 당신 방 인원 수</span>
            </div>
            <p className="text-sm font-black font-mono text-white">
              실제 수용 인원: <span className="text-purple-300 text-lg">{psychicCount}명</span> (본인 포함)
            </p>
          </motion.div>
        )}

        {/* Witness Clues */}
        {role?.id === 'witness' && witnessClues.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 rounded-2xl bg-cyan-950/50 border border-cyan-800/60 text-cyan-200 space-y-2 shadow-lg"
          >
            <div className="flex items-center gap-2 font-bold text-sm text-cyan-300">
              <Eye className="w-5 h-5 text-cyan-400" />
              <span>[목격 단서] 사건 발생 당시의 기억</span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              {witnessClues[0]?.clue}
            </p>
          </motion.div>
        )}

        {/* Forensic Clues */}
        {role?.id === 'forensic' && forensicClues.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 rounded-2xl bg-emerald-950/50 border border-emerald-800/60 text-emerald-200 space-y-2 shadow-lg"
          >
            <div className="flex items-center gap-2 font-bold text-sm text-emerald-300">
              <FileText className="w-5 h-5 text-emerald-400" />
              <span>[국과수 부검 보고서]</span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              {forensicClues[0]?.clue}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. Alive & Status Metrics */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-center space-y-0.5">
          <div className="text-[11px] font-semibold text-zinc-400">생존자</div>
          <div className="text-xl font-black font-mono text-emerald-400">{aliveCount}명</div>
        </div>
        <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-center space-y-0.5">
          <div className="text-[11px] font-semibold text-zinc-400">사망자</div>
          <div className="text-xl font-black font-mono text-red-400">{deadCount}명</div>
        </div>
        <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-center space-y-0.5">
          <div className="text-[11px] font-semibold text-zinc-400">영구 제외</div>
          <div className="text-xl font-black font-mono text-amber-400">{removedCount}명</div>
        </div>
      </div>

      {/* 5. Navigation & Next Actions */}
      <div className="space-y-2.5 pt-2">
        {onGoToDiscussion && isHost && (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onGoToDiscussion}
            className="w-full py-4 rounded-2xl bg-amber-600 hover:bg-amber-700 active:scale-98 text-white font-bold text-sm shadow-xl shadow-amber-950/50 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
            <span>오프라인 토론 & 특수 행동 단계로 진행</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}

        <div className="grid grid-cols-2 gap-2">
          {onSelectTab && (
            <>
              <button
                type="button"
                onClick={() => onSelectTab('hub')}
                className="py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-zinc-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5 text-amber-400" /> 내 역할/능력 확인
              </button>
              <button
                type="button"
                onClick={() => onSelectTab('players')}
                className="py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-zinc-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Users className="w-3.5 h-3.5 text-blue-400" /> 참가자 상태 목록
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
