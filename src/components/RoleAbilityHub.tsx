import React, { useState } from 'react';
import { Player, GameState } from '../types';
import {
  ShieldAlert,
  Search,
  Eye,
  Activity,
  Flame,
  KeyRound,
  Coins,
  Skull,
  Crosshair,
  Sparkles,
  AlertTriangle,
  Lock,
  CheckCircle2,
  Dice5,
  UserCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface RoleAbilityHubProps {
  game: GameState;
  currentPlayer: Player;
  onPoliceArrest: (targetPlayerId: string) => void;
  onCorruptPoliceArrest: (targetPlayerId: string) => void;
  onWardenJail: (targetPlayerId: string | null) => void;
  onGamblerBet: (betTeam: 'citizen' | 'killer') => void;
  onUsePrisonPass: () => void;
  isSubmitting: boolean;
}

export const RoleAbilityHub: React.FC<RoleAbilityHubProps> = ({
  game,
  currentPlayer,
  onPoliceArrest,
  onCorruptPoliceArrest,
  onWardenJail,
  onGamblerBet,
  onUsePrisonPass,
  isSubmitting,
}) => {
  const roleId = currentPlayer.roleId;
  const isAlive = currentPlayer.status === 'ALIVE';
  const isAbilityPhase = game.phase === 'ABILITY_ACTION';

  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  const [confirmModalType, setConfirmModalType] = useState<
    'POLICE_ARREST' | 'CORRUPT_ARREST' | 'WARDEN_JAIL' | 'GAMBLER_BET' | null
  >(null);
  const [selectedBetTeam, setSelectedBetTeam] = useState<'citizen' | 'killer'>('citizen');

  const aliveOtherPlayers = game.players.filter(
    (p) => p.id !== currentPlayer.id && p.status === 'ALIVE'
  );

  const selectedTargetPlayer = game.players.find((p) => p.id === selectedTargetId);

  // If no role or dead (and not host), return null or simple note
  if (!roleId) return null;

  return (
    <div className="w-full space-y-4" id="role-ability-hub">
      <div className={`p-4 rounded-2xl border ${isAbilityPhase ? 'bg-yellow-950/30 border-yellow-700/60' : 'bg-zinc-900/70 border-zinc-800'}`}>
        <div className="text-sm font-black text-white">{isAbilityPhase ? '⚡ 지금은 특수능력 선택 단계입니다' : '특수능력 대기 중'}</div>
        <p className="mt-1 text-xs text-zinc-400">
          {isAbilityPhase
            ? '사용형 직업은 제한 시간 안에 능력을 실행하세요. 사용하지 않아도 시간이 끝나면 자동으로 낮 결과로 넘어갑니다.'
            : '특수능력 버튼은 방 선택이 끝난 뒤 자동으로 활성화됩니다.'}
        </p>
      </div>
      {/* Shared inventory / emergency actions */}
      <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 className="font-bold text-sm text-white">보유 아이템</h4>
            <p className="text-[11px] text-zinc-400">방 지정권은 방 선택 화면에서, 탈옥권은 감옥에 갇혔을 때 사용합니다.</p>
          </div>
          <div className="flex gap-2 text-[11px] font-bold">
            <span className="px-2.5 py-1 rounded-full bg-zinc-950 border border-zinc-700 text-zinc-300">방 지정권 {currentPlayer.inventory?.roomPassCount || 0}</span>
            <span className="px-2.5 py-1 rounded-full bg-zinc-950 border border-zinc-700 text-zinc-300">탈옥권 {currentPlayer.inventory?.prisonPassCount || 0}</span>
          </div>
        </div>

        {currentPlayer.currentRoom === 'PRISON' && isAlive && isAbilityPhase && (currentPlayer.inventory?.prisonPassCount || 0) > 0 && (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onUsePrisonPass}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-sm active:scale-[0.98] transition-all disabled:opacity-50"
          >
            탈옥권 사용하기
          </button>
        )}
      </div>
      {/* 1. 경찰 (Police) View */}
      {roleId === 'police' && (
        <div className="p-4 rounded-2xl bg-blue-950/40 border border-blue-800/60 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-900/60 text-blue-300 border border-blue-700/50">
                <Crosshair className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">경찰 특수 수사권</h4>
                <p className="text-xs text-blue-200">살인마를 지목해 체포하십시오</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-600 text-white">
              {currentPlayer.abilityUsesRemaining > 0 ? '1회 사용 가능' : '사용 완료'}
            </span>
          </div>

          {/* Police Attacked Alert (Protected in normal room) */}
          {currentPlayer.policeAttackedAlert && (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="p-3.5 rounded-xl bg-red-950/80 border border-red-600 text-red-200 text-xs flex items-start gap-2.5"
            >
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-red-300 font-bold block text-sm">
                  살인마 습격 감지 경보!
                </strong>
                <p className="text-red-200 leading-relaxed mt-0.5">
                  이번 라운드에 당신을 향한 살인마의 공격이 발생했으나, 경찰 방어 특성으로 무사히
                  생존했습니다. 같은 방에 있었던 인물을 유력 용의자로 수사하세요!
                </p>
              </div>
            </motion.div>
          )}

          <div className="text-xs text-zinc-300 space-y-1 bg-zinc-900/60 p-3 rounded-xl border border-zinc-800">
            <p>
              • <strong className="text-emerald-400">살인마 검거 성공 시:</strong> 즉시 시민 진영
              승리!
            </p>
            <p>
              • <strong className="text-amber-400">무고한 시민 체포 시:</strong> 대상과 경찰 모두
              동시에 게임에서 영구 제외(REMOVED)됩니다.
            </p>
          </div>

          {isAlive && isAbilityPhase && currentPlayer.abilityUsesRemaining > 0 && (
            <div className="flex gap-2 pt-1">
              <select
                value={selectedTargetId}
                onChange={(e) => setSelectedTargetId(e.target.value)}
                className="flex-1 bg-zinc-900 border border-blue-700/60 text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">체포할 용의자 선택...</option>
                {aliveOtherPlayers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nickname}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!selectedTargetId || isSubmitting}
                onClick={() => setConfirmModalType('POLICE_ARREST')}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                체포 집행
              </button>
            </div>
          )}
        </div>
      )}

      {/* 2. 부패경찰 (Corrupt Police) View */}
      {roleId === 'corrupt_police' && (
        <div className="p-4 rounded-2xl bg-red-950/40 border border-red-800/60 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-red-900/60 text-red-300 border border-red-700/50">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">부패경찰 — 동귀어진 체포</h4>
                <p className="text-xs text-red-200">생존자 1명과 함께 게임에서 자폭 제외</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-700 text-white">
              {currentPlayer.abilityUsesRemaining > 0 ? '1회 사용 가능' : '사용 완료'}
            </span>
          </div>

          <div className="text-xs text-zinc-300 bg-zinc-900/60 p-3 rounded-xl border border-zinc-800">
            <p className="leading-relaxed">
              선택한 플레이어 1명을 체포하면서 본인도 함께 게임에서 영구 제외(REMOVED)됩니다. 시민
              진영의 진짜 경찰이나 핵심 정보직을 저격하여 살인마를 승리로 이끄십시오.
            </p>
          </div>

          {isAlive && isAbilityPhase && currentPlayer.abilityUsesRemaining > 0 && (
            <div className="flex gap-2 pt-1">
              <select
                value={selectedTargetId}
                onChange={(e) => setSelectedTargetId(e.target.value)}
                className="flex-1 bg-zinc-900 border border-red-700/60 text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-red-500"
              >
                <option value="">동귀어진할 대상 선택...</option>
                {aliveOtherPlayers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nickname}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!selectedTargetId || isSubmitting}
                onClick={() => setConfirmModalType('CORRUPT_ARREST')}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                동귀어진 체포
              </button>
            </div>
          )}
        </div>
      )}

      {/* 3. 살인마 (Killer) View */}
      {roleId === 'killer' && (
        <div className="p-4 rounded-2xl bg-red-950/40 border border-red-800/60 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-red-900/60 text-red-300 border border-red-700/50">
                <Skull className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">살인마 살인 진척 현황</h4>
                <p className="text-xs text-red-200">총 3회 살인 성공 시 살인마 진영 즉시 승리</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-lg font-black font-mono text-red-400">
                {game.killerKillCount} / 3회
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-zinc-900 h-2.5 rounded-full overflow-hidden border border-zinc-800">
            <div
              className="bg-red-600 h-full transition-all duration-500"
              style={{ width: `${Math.min(100, (game.killerKillCount / 3) * 100)}%` }}
            />
          </div>

          <div className="text-xs text-zinc-300 bg-zinc-900/60 p-3 rounded-xl border border-zinc-800 space-y-1">
            <p>
              • <strong className="text-white">살인 성립 조건:</strong> 일반 방에서 다른 플레이어와{' '}
              <strong className="text-red-400">정확히 1:1로 단둘이 배정</strong>될 때 자동 발동.
            </p>
            <p>
              • <strong className="text-zinc-400">살인 불발:</strong> 3명 이상이 모이거나,
              추종자/부패경찰/일반 방의 경찰은 사망하지 않습니다.
            </p>
          </div>
        </div>
      )}

      {/* 4. 추종자 (Follower) View */}
      {roleId === 'follower' && (
        <div className="p-4 rounded-2xl bg-red-950/30 border border-red-800/40 space-y-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-red-900/40 text-red-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white">추종자 — 살인마의 비호</h4>
              <p className="text-xs text-red-300">일반 방 1:1 상황에서도 살인마에게 살해되지 않음</p>
            </div>
          </div>
          <p className="text-xs text-zinc-300 leading-relaxed">
            당신은 일반 방에서 살인마와 1:1로 배정되더라도 안전합니다 (단, 감옥에서는 살해될 수
            있습니다). 시민인 척 토론에 참여하여 살인마를 변호하고 수사를 교란하십시오.
          </p>
        </div>
      )}

      {/* 5. 법의학자 (Forensic Scientist) View */}
      {roleId === 'forensic' && (
        <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-800/60 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-cyan-900/60 text-cyan-300 border border-cyan-700/50">
                <Search className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">법의학자 — 비밀 부검 감식 기록</h4>
                <p className="text-xs text-cyan-200">살인 사건 발생 시 익일 낮에 비밀 단서 획득</p>
              </div>
            </div>
          </div>

          {currentPlayer.forensicClues && currentPlayer.forensicClues.length > 0 ? (
            <div className="space-y-2">
              {currentPlayer.forensicClues.map((clue, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-zinc-900/90 border border-cyan-700/50 text-xs text-cyan-100 space-y-1"
                >
                  <div className="font-bold text-cyan-400 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5" />
                    [ROUND {clue.round}] {clue.victimNickname} 피해자 감식 보고서
                  </div>
                  <p className="text-zinc-300 leading-relaxed">{clue.clue}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-zinc-400 p-3 bg-zinc-900/60 rounded-xl border border-zinc-800 text-center">
              아직 조사 가능한 살인 사건이 발생하지 않았거나 단서를 분석 중입니다.
            </div>
          )}
        </div>
      )}

      {/* 6. 목격자 (Witness) View */}
      {roleId === 'witness' && (
        <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-800/60 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-purple-900/60 text-purple-300 border border-purple-700/50">
                <Eye className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">목격자 — 사건 현장 목격 일지</h4>
                <p className="text-xs text-purple-200">살인 발생 라운드에 비밀 목격 단서 획득</p>
              </div>
            </div>
          </div>

          {currentPlayer.witnessClues && currentPlayer.witnessClues.length > 0 ? (
            <div className="space-y-2">
              {currentPlayer.witnessClues.map((clue, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-zinc-900/90 border border-purple-700/50 text-xs text-purple-100 space-y-1"
                >
                  <div className="font-bold text-purple-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    [ROUND {clue.round}] 목격 정보 ({clue.victimNickname} 피격 당시)
                  </div>
                  <p className="text-zinc-300 leading-relaxed">{clue.clue}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-zinc-400 p-3 bg-zinc-900/60 rounded-xl border border-zinc-800 text-center">
              이번 라운드에 목격된 특이 동선이 없습니다.
            </div>
          )}
        </div>
      )}

      {/* 7. 초감각자 (Extrasensory / Psychic) View */}
      {roleId === 'psychic' && (
        <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-800/60 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-indigo-900/60 text-indigo-300 border border-indigo-700/50">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">초감각자 — 실제 인원수 직감</h4>
                <p className="text-xs text-indigo-200">본인이 배정된 방의 실제 인원수 투시</p>
              </div>
            </div>
          </div>

          {currentPlayer.currentRoom && currentPlayer.extrasensoryRoomCount !== null && currentPlayer.extrasensoryRoomCount !== undefined ? (
            <div className="p-3.5 rounded-xl bg-indigo-900/50 border border-indigo-600 text-center space-y-1">
              <div className="text-xs text-indigo-300 font-semibold">
                {currentPlayer.currentRoom} ROOM 실제 서버 배정 인원
              </div>
              <div className="text-2xl font-black font-mono text-white">
                총 {currentPlayer.extrasensoryRoomCount ?? 0}명
              </div>
              <div className="text-[11px] text-indigo-200">
                (플레이어들의 말과 비교하여 거짓말하는 자를 추려내십시오)
              </div>
            </div>
          ) : (
            <div className="text-xs text-zinc-400 p-3 bg-zinc-900/60 rounded-xl border border-zinc-800 text-center">
              방 배정 정산이 완료되면 실제 인원수가 여기에 표시됩니다.
            </div>
          )}
        </div>
      )}

      {/* 8. 교도관 (Warden) View */}
      {roleId === 'warden' && (
        <div className="p-4 rounded-2xl bg-blue-950/40 border border-blue-800/60 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-900/60 text-blue-300 border border-blue-700/50">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">교도관 — 감옥 격리 권한</h4>
                <p className="text-xs text-blue-200">방 선택 후 1명을 감옥으로 수감</p>
              </div>
            </div>
          </div>

          <p className="text-xs text-zinc-300 leading-relaxed">
            방 선택이 끝난 뒤 대상의 실제 이동 위치를 감옥(PRISON)으로 바꿉니다. 대상이 탈옥권을 사용하면 원래 선택했던 방으로 돌아갑니다.
          </p>

          <div className="flex items-center justify-between text-[11px] text-zinc-400">
            <span>남은 수감 지정 횟수</span>
            <span className="font-mono font-bold text-blue-300">{currentPlayer.abilityUsesRemaining}회</span>
          </div>

          {game.wardenTargetPlayerId && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-xs text-emerald-300 font-bold text-center">
              이번 라운드 감옥 대상 지정 완료
            </div>
          )}

          {isAlive && isAbilityPhase && !game.wardenTargetPlayerId && currentPlayer.abilityUsesRemaining > 0 && (
            <div className="flex gap-2 pt-1">
              <select
                value={selectedTargetId}
                onChange={(e) => setSelectedTargetId(e.target.value)}
                className="flex-1 bg-zinc-900 border border-blue-700/60 text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">감옥에 수감할 플레이어 선택...</option>
                {aliveOtherPlayers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nickname}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!selectedTargetId || isSubmitting}
                onClick={() => setConfirmModalType('WARDEN_JAIL')}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                수감 지정
              </button>
            </div>
          )}
        </div>
      )}

      {/* 9. 소매치기 (Pickpocket) View */}
      {roleId === 'pickpocket' && (
        <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-800/60 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-purple-900/60 text-purple-300 border border-purple-700/50">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">소매치기 — 절도 목표</h4>
                <p className="text-xs text-purple-200">총 3회 절도 성공 + 게임 종료 시 생존</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-lg font-black font-mono text-purple-300">
                {currentPlayer.stealCount || 0} / 3회
              </span>
            </div>
          </div>

          {/* Steal Progress Bar */}
          <div className="w-full bg-zinc-900 h-2.5 rounded-full overflow-hidden border border-zinc-800">
            <div
              className="bg-purple-600 h-full transition-all duration-500"
              style={{ width: `${Math.min(100, ((currentPlayer.stealCount || 0) / 3) * 100)}%` }}
            />
          </div>

          <div className="text-xs text-zinc-300 bg-zinc-900/60 p-3 rounded-xl border border-zinc-800">
            일반 방에서 다른 플레이어와 <strong>1:1로 단둘이 배정</strong>되면 자동으로 절도에
            성공합니다. (상대에게 정체가 공개되지 않음)
          </div>
        </div>
      )}

      {/* 10. 사이코패스 (Psychopath) View */}
      {roleId === 'psychopath' && (
        <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-800/60 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-purple-900/60 text-purple-300 border border-purple-700/50">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">사이코패스 — 광기의 생존</h4>
                <p className="text-xs text-purple-200">살인마 살인 3회 성공 + 본인 최종 생존</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-lg font-black font-mono text-purple-300">
                {game.killerKillCount} / 3회
              </span>
            </div>
          </div>

          <div className="text-xs text-zinc-300 bg-zinc-900/60 p-3 rounded-xl border border-zinc-800">
            살인마가 3회 살인을 성공하도록 은밀히 돕고, 게임 종료 시점까지 당신 자신이 살아남으면 개인
            승리합니다.
          </div>
        </div>
      )}

      {/* 11. 도박꾼 (Gambler) View */}
      {roleId === 'gambler' && (
        <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-800/60 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-purple-900/60 text-purple-300 border border-purple-700/50">
                <Dice5 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">도박꾼 — 승리 진영 베팅</h4>
                <p className="text-xs text-purple-200">베팅 진영 승리 + 본인 최종 생존</p>
              </div>
            </div>
            {currentPlayer.gamblerBet ? (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-600 text-white">
                {currentPlayer.gamblerBet === 'citizen' ? '시민 진영 베팅' : '살인마 진영 베팅'}
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-600 text-white animate-pulse">
                베팅 미완료
              </span>
            )}
          </div>

          {!currentPlayer.gamblerBet && isAlive && isAbilityPhase ? (
            <div className="space-y-2 pt-1">
              <div className="text-xs text-zinc-300">승리할 것으로 예상되는 진영을 선택하십시오:</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBetTeam('citizen');
                    setConfirmModalType('GAMBLER_BET');
                  }}
                  className="py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs transition-all"
                >
                  시민 진영에 베팅
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBetTeam('killer');
                    setConfirmModalType('GAMBLER_BET');
                  }}
                  className="py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs transition-all"
                >
                  살인마 진영에 베팅
                </button>
              </div>
            </div>
          ) : currentPlayer.gamblerBet ? (
            <div className="text-xs text-zinc-300 bg-zinc-900/60 p-3 rounded-xl border border-zinc-800">
              베팅 완료: <strong>{currentPlayer.gamblerBet === 'citizen' ? '시민 진영' : '살인마 진영'}</strong>이
              승리하고 본인이 끝까지 생존하면 개인 승리합니다.
            </div>
          ) : (
            <div className="text-xs text-zinc-400 bg-zinc-900/60 p-3 rounded-xl border border-zinc-800 text-center">
              방 선택이 끝난 뒤 <strong className="text-yellow-400">특수능력 선택 단계</strong>에서 베팅할 수 있습니다.
            </div>
          )}
        </div>
      )}

      {/* 12. 일반시민 (Citizen) View */}
      {roleId === 'citizen' && (
        <div className="p-4 rounded-2xl bg-blue-950/30 border border-blue-800/40 space-y-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-900/40 text-blue-300">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white">일반시민 — 직접 사용 능력 없음</h4>
              <p className="text-xs text-blue-300">채팅과 추리, 방 선택으로 살인마를 찾아내십시오.</p>
            </div>
          </div>
          <p className="text-xs text-zinc-400">이 역할은 버튼형 특수능력이 없는 대신 자유롭게 정보를 모으고 토론에 참여합니다.</p>
        </div>
      )}

      {/* Confirmation Modals */}
      <AnimatePresence>
        {confirmModalType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-zinc-900 border border-zinc-700 p-5 rounded-2xl shadow-2xl space-y-4"
            >
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                {confirmModalType === 'POLICE_ARREST' && '경찰 체포 권한 집행'}
                {confirmModalType === 'CORRUPT_ARREST' && '부패경찰 동귀어진 체포'}
                {confirmModalType === 'WARDEN_JAIL' && '교도관 감옥 수감'}
                {confirmModalType === 'GAMBLER_BET' && '승리 진영 베팅 확정'}
              </h3>

              <div className="text-xs text-zinc-300 space-y-2 leading-relaxed">
                {confirmModalType === 'POLICE_ARREST' && (
                  <p>
                    정말 <strong className="text-white">{selectedTargetPlayer?.nickname}</strong> 님을
                    체포하시겠습니까? 살인마가 아닐 경우 귀하와 대상 모두 게임에서 영구
                    제외(REMOVED)됩니다.
                  </p>
                )}
                {confirmModalType === 'CORRUPT_ARREST' && (
                  <p>
                    정말 <strong className="text-white">{selectedTargetPlayer?.nickname}</strong> 님을
                    체포하시겠습니까? <strong>본인과 대상 모두 게임에서 영구 제외(REMOVED)</strong>
                    됩니다.
                  </p>
                )}
                {confirmModalType === 'WARDEN_JAIL' && (
                  <p>
                    이번 라운드에 <strong className="text-white">{selectedTargetPlayer?.nickname}</strong>{' '}
                    님을 감옥(PRISON)으로 격리하시겠습니까?
                  </p>
                )}
                {confirmModalType === 'GAMBLER_BET' && (
                  <p>
                    <strong className="text-white">
                      {selectedBetTeam === 'citizen' ? '시민 진영' : '살인마 진영'}
                    </strong>
                    에 베팅하시겠습니까? 한 번 선택한 베팅은 변경할 수 없습니다.
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmModalType(null)}
                  className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs transition-all"
                >
                  취소
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => {
                    if (confirmModalType === 'POLICE_ARREST' && selectedTargetId) {
                      onPoliceArrest(selectedTargetId);
                    } else if (confirmModalType === 'CORRUPT_ARREST' && selectedTargetId) {
                      onCorruptPoliceArrest(selectedTargetId);
                    } else if (confirmModalType === 'WARDEN_JAIL' && selectedTargetId) {
                      onWardenJail(selectedTargetId);
                    } else if (confirmModalType === 'GAMBLER_BET') {
                      onGamblerBet(selectedBetTeam);
                    }
                    setConfirmModalType(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-all"
                >
                  확인 및 실행
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
