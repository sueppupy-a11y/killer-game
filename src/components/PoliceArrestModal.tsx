import React, { useState } from 'react';
import { Player } from '../types';
import { Shield, AlertTriangle, Check, X, Skull, Lock } from 'lucide-react';

interface PoliceArrestModalProps {
  isOpen: boolean;
  onClose: () => void;
  alivePlayers: Player[];
  currentUserId: string;
  onConfirmArrest: (targetPlayerId: string) => Promise<void>;
  isSubmitting: boolean;
}

export const PoliceArrestModal: React.FC<PoliceArrestModalProps> = ({
  isOpen,
  onClose,
  alivePlayers,
  currentUserId,
  onConfirmArrest,
  isSubmitting,
}) => {
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  if (!isOpen) return null;

  // Filter out the current user (the police itself)
  const candidateTargets = alivePlayers.filter((p) => p.id !== currentUserId);
  const selectedPlayer = candidateTargets.find((p) => p.id === selectedTargetId);

  const handleOpenConfirm = () => {
    if (!selectedTargetId) return;
    setShowConfirmDialog(true);
  };

  const handleExecuteArrest = async () => {
    if (!selectedTargetId) return;
    await onConfirmArrest(selectedTargetId);
    setShowConfirmDialog(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-zinc-950 border-2 border-blue-600/80 rounded-3xl p-6 shadow-2xl text-zinc-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-950/80 border border-blue-700/60 text-blue-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">경찰 특수 수사권: 용의자 체포</h2>
              <div className="text-xs text-blue-300">진짜 살인마를 지목해 체포하십시오.</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Suspect Selection List */}
        <div className="flex-1 overflow-y-auto py-4 space-y-2.5">
          <div className="text-xs font-semibold text-zinc-400 mb-2">
            체포할 용의자 플레이어를 선택하세요 ({candidateTargets.length}명 생존):
          </div>

          {candidateTargets.length === 0 ? (
            <div className="p-6 text-center text-zinc-400 text-sm">
              체포 가능한 다른 생존자가 없습니다.
            </div>
          ) : (
            <div className="space-y-2">
              {candidateTargets.map((player) => {
                const isSelected = selectedTargetId === player.id;
                return (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => setSelectedTargetId(player.id)}
                    className={`w-full p-3.5 rounded-xl border text-left flex items-center justify-between transition-all select-none ${
                      isSelected
                        ? 'bg-blue-950/60 border-blue-500 ring-2 ring-blue-500/40 text-white'
                        : 'bg-zinc-900/80 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-850'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected ? 'border-blue-400 bg-blue-500' : 'border-zinc-600'
                        }`}
                      >
                        {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      <span className="font-bold text-sm">{player.nickname}</span>
                    </div>

                    {player.currentRoom && (
                      <span className="text-xs font-mono text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded">
                        {player.currentRoom} ROOM
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="pt-4 border-t border-zinc-800 space-y-2">
          <button
            type="button"
            disabled={!selectedTargetId || isSubmitting}
            onClick={handleOpenConfirm}
            className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
              selectedTargetId
                ? 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white shadow-lg shadow-blue-950/60'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-500 cursor-not-allowed'
            }`}
          >
            <Lock className="w-4 h-4" />
            {selectedPlayer ? `[${selectedPlayer.nickname}] 체포 진행하기` : '체포 대상 선택 필요'}
          </button>
        </div>

        {/* Double Confirmation Dialog */}
        {showConfirmDialog && selectedPlayer && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 animate-fadeIn">
            <div className="w-full max-w-sm bg-zinc-950 border-2 border-red-500 rounded-2xl p-6 text-center space-y-4 shadow-2xl">
              <div className="p-3 rounded-full bg-red-950/70 border border-red-700/60 text-red-400 inline-flex">
                <AlertTriangle className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">체포 확인</h3>
                <p className="text-sm text-zinc-300">
                  정말 <strong className="text-red-400 font-bold">{selectedPlayer.nickname}</strong> 님을 체포하시겠습니까?
                </p>
              </div>

              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 text-left space-y-1">
                <div>• 체포된 플레이어는 즉시 구속 상태가 되며 행동이 정지됩니다.</div>
                <div>• 체포 대상이 <span className="text-red-400 font-bold">진짜 살인마</span>일 경우 즉시 <span className="text-blue-400 font-bold">시민 승리</span>로 게임이 종료됩니다.</div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmDialog(false)}
                  disabled={isSubmitting}
                  className="py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-sm transition-colors"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleExecuteArrest}
                  disabled={isSubmitting}
                  className="py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm transition-all shadow-lg shadow-red-950 flex items-center justify-center gap-1.5"
                >
                  <Lock className="w-4 h-4" />
                  {isSubmitting ? '체포 집행 중...' : '체포 확정'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
