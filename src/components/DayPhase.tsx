import React from 'react';
import { GameState, Player, RoomId } from '../types';
import {
  Sun,
  Shield,
  Eye,
  FileText,
  Users,
  AlertTriangle,
  Sparkles,
  Lock,
  Skull,
  Siren,
  ArrowRight,
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

const ROOM_THEMES: Record<RoomId, { subtitle: string; desc: string }> = {
  A: { subtitle: '중앙 통로', desc: '넓은 복도로 도주로가 많지만 발소리가 울리는 곳' },
  B: { subtitle: '의무 연구실', desc: '의료 장비와 약품 캐비닛이 구비된 폐쇄 연구구역' },
  C: { subtitle: '보안 통제실', desc: 'CCTV 모니터와 비상 셔터 스위치가 있는 통제 구역' },
  D: { subtitle: '기록 보관소', desc: '오래된 문서 철과 철제 책장이 가득한 미로 같은 공간' },
  E: { subtitle: '기계 시설실', desc: '발전기와 배관 소음으로 주변 소리가 차단되는 시설' },
  F: { subtitle: '폐쇄 창고', desc: '조명이 거의 닿지 않는 어둡고 고립된 지하 격납 창고' },
};

export const DayPhase: React.FC<DayPhaseProps> = ({
  game,
  currentPlayer,
  onSelectTab,
}) => {
  const myRoom = currentPlayer.currentRoom || currentPlayer.selectedRoom;
  const isPrison = myRoom === 'PRISON';
  const role = currentPlayer.role;

  const psychicCount = currentPlayer.extrasensoryRoomCount;
  const witnessClue = (currentPlayer.witnessClues || []).find((clue) => clue.round === game.round);
  // 법의학 단서는 이전 라운드 사건이 현재 라운드 시작 때 전달될 수 있으므로 최신 단서를 표시.
  const forensicClue = (currentPlayer.forensicClues || [])[0];
  const policeAlert = currentPlayer.policeAttackedAlert;

  const aliveCount = game.players.filter((p) => p.status === 'ALIVE').length;
  const deadCount = game.players.filter((p) => p.status === 'DEAD').length;
  const removedCount = game.players.filter((p) => p.status === 'REMOVED').length;

  const publicEvents = game.logs
    .filter((log) => log.round === game.round && (log.type === 'death' || log.type === 'arrest'))
    .slice()
    .reverse();

  return (
    <div className="w-full space-y-5" id="day-phase-container">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-3xl bg-gradient-to-br from-amber-950/40 via-zinc-900 to-zinc-950 border border-amber-800/50 text-center space-y-4 shadow-2xl"
      >
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-950/80 border border-amber-700/60 text-amber-300 text-xs font-black tracking-wider uppercase">
          <Sun className="w-3.5 h-3.5" />
          ROUND {String(game.round).padStart(2, '0')} · 결과 발표
        </div>

        <div>
          <h2 className="text-2xl font-black text-white">☀️ 낮이 되었습니다.</h2>
          <p className="mt-1 text-xs text-amber-200/80">이번 라운드의 공개 결과와 내 비밀 정보를 확인하세요.</p>
        </div>

        {/* Public result announcement */}
        <div className="p-4 rounded-2xl bg-zinc-950/90 border border-zinc-800 text-left space-y-2">
          <div className="text-xs font-black text-zinc-300 flex items-center gap-2">
            <Siren className="w-4 h-4 text-red-400" /> 공개 사건 결과
          </div>
          {publicEvents.length > 0 ? (
            publicEvents.map((event) => (
              <div key={event.id} className={`p-3 rounded-xl border text-sm font-bold ${event.type === 'death' ? 'bg-red-950/40 border-red-900/60 text-red-200' : 'bg-amber-950/30 border-amber-900/50 text-amber-200'}`}>
                {event.type === 'death' && <Skull className="inline w-4 h-4 mr-1.5" />}
                {event.message}
              </div>
            ))
          ) : (
            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-900/50 text-emerald-300 text-sm font-bold text-center">
              이번 라운드에는 공개된 사망/체포 사건이 없습니다.
            </div>
          )}
        </div>

        {/* Private room */}
        <div className="p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800 text-center space-y-2">
          <span className="text-xs font-semibold text-zinc-400">내가 최종 이동한 위치</span>
          {isPrison ? (
            <div>
              <div className="text-3xl font-black font-mono text-red-400 flex items-center justify-center gap-2">
                <Lock className="w-6 h-6" /> PRISON
              </div>
              <p className="text-xs text-zinc-400">교도관에 의해 감옥에 격리되었습니다.</p>
            </div>
          ) : myRoom ? (
            <div>
              <div className="text-4xl font-black font-mono text-white tracking-wider">{myRoom} ROOM</div>
              <div className="text-xs font-bold text-amber-300">{ROOM_THEMES[myRoom as RoomId]?.subtitle}</div>
              <p className="text-[11px] text-zinc-500">{ROOM_THEMES[myRoom as RoomId]?.desc}</p>
            </div>
          ) : (
            <div className="text-xl font-bold text-zinc-400">배정 정보 없음</div>
          )}
          <div className="pt-2 text-[11px] text-zinc-500">이 위치 정보는 본인에게만 공개됩니다.</div>
        </div>
      </motion.div>

      {/* Private role clues */}
      <AnimatePresence>
        {policeAlert && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-2xl bg-red-950/70 border border-red-700/80">
            <div className="flex items-center gap-2 font-bold text-sm text-red-300">
              <AlertTriangle className="w-5 h-5" /> [비밀 경보] 살인마의 습격을 받았지만 생존했습니다.
            </div>
          </motion.div>
        )}

        {role?.id === 'psychic' && psychicCount !== null && psychicCount !== undefined && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-2xl bg-purple-950/50 border border-purple-800/60">
            <div className="flex items-center gap-2 font-bold text-sm text-purple-300">
              <Sparkles className="w-5 h-5" /> [초감각] 실제 방 인원: <strong className="text-white">{psychicCount}명</strong>
            </div>
          </motion.div>
        )}

        {role?.id === 'witness' && witnessClue && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-2xl bg-cyan-950/50 border border-cyan-800/60 space-y-1">
            <div className="flex items-center gap-2 font-bold text-sm text-cyan-300"><Eye className="w-5 h-5" /> [목격자 비밀 단서]</div>
            <p className="text-xs text-zinc-300">{witnessClue.clue}</p>
          </motion.div>
        )}

        {role?.id === 'forensic' && forensicClue && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-2xl bg-emerald-950/50 border border-emerald-800/60 space-y-1">
            <div className="flex items-center gap-2 font-bold text-sm text-emerald-300"><FileText className="w-5 h-5" /> [법의학자 비밀 단서]</div>
            <p className="text-xs text-zinc-300">{forensicClue.clue}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-3 gap-2">
        <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-center"><div className="text-[11px] text-zinc-400">생존</div><div className="text-xl font-black text-emerald-400">{aliveCount}</div></div>
        <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-center"><div className="text-[11px] text-zinc-400">사망</div><div className="text-xl font-black text-red-400">{deadCount}</div></div>
        <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-center"><div className="text-[11px] text-zinc-400">제외</div><div className="text-xl font-black text-amber-400">{removedCount}</div></div>
      </div>

      <div className="p-4 rounded-2xl bg-blue-950/20 border border-blue-900/40 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-black text-white">다음 라운드는 자동으로 시작됩니다.</div>
          <p className="text-xs text-zinc-400">위 타이머가 끝나면 별도 버튼 없이 바로 대화 단계로 이동합니다.</p>
        </div>
        <ArrowRight className="w-5 h-5 text-blue-400 flex-shrink-0" />
      </div>

      {onSelectTab && (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => onSelectTab('hub')} className="py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-200 flex items-center justify-center gap-1.5"><Shield className="w-4 h-4 text-yellow-400" />내 역할 확인</button>
          <button type="button" onClick={() => onSelectTab('players')} className="py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-200 flex items-center justify-center gap-1.5"><Users className="w-4 h-4 text-blue-400" />참가자 상태</button>
        </div>
      )}
    </div>
  );
};
