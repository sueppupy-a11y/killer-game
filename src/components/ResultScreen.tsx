import React from 'react';
import { GameState } from '../types';
import { ROLES_DATA, getTeamColor } from '../rolesData';
import { Trophy, Shield, Skull, RotateCcw, Heart, Ban, CheckCircle, XCircle } from 'lucide-react';

interface ResultScreenProps {
  game: GameState;
  isHost: boolean;
  onRestart: () => Promise<void>;
  isSubmitting: boolean;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({
  game,
  isHost,
  onRestart,
  isSubmitting,
}) => {
  const winner = game.winner;
  const isCitizenWin = winner === 'citizen';
  const isKillerWin = winner === 'killer';

  const bannerColor = isCitizenWin
    ? 'from-blue-900/80 via-zinc-950 to-zinc-950 border-blue-600 text-blue-400'
    : isKillerWin
    ? 'from-red-900/80 via-zinc-950 to-zinc-950 border-red-600 text-red-500'
    : 'from-purple-900/80 via-zinc-950 to-zinc-950 border-purple-600 text-purple-400';

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-fadeIn pb-12" id="result-screen">
      {/* Winner Hero Banner */}
      <div
        className={`p-8 sm:p-10 rounded-3xl border-2 bg-gradient-to-b ${bannerColor} text-center space-y-4 shadow-2xl relative overflow-hidden`}
      >
        <div className="inline-flex p-4 rounded-3xl bg-zinc-900/90 border border-zinc-700/80 shadow-2xl">
          {isCitizenWin ? (
            <Shield className="w-16 h-16 text-blue-400 animate-bounce" />
          ) : isKillerWin ? (
            <Skull className="w-16 h-16 text-red-500 animate-pulse" />
          ) : (
            <Trophy className="w-16 h-16 text-purple-400" />
          )}
        </div>

        <div className="space-y-1">
          <span className="text-xs uppercase tracking-widest text-zinc-400 font-bold">
            GAME OVER • 최종 진영 결과
          </span>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white">
            {isCitizenWin
              ? '시민 진영 승리'
              : isKillerWin
              ? '살인마 진영 승리'
              : '게임 종료'}
          </h1>
        </div>

        {game.winnerReason && (
          <p className="max-w-xl mx-auto text-sm sm:text-base text-zinc-200 font-medium bg-black/40 py-2.5 px-4 rounded-xl border border-zinc-800">
            {game.winnerReason}
          </p>
        )}
      </div>

      {/* 12 Players Full True Role Revelation & Individual Win Results */}
      <div className="space-y-4">
        <div className="text-center space-y-1">
          <h2 className="text-xl font-bold text-white tracking-tight">12인 최종 정체 및 개인 승패 결과</h2>
          <p className="text-xs text-zinc-400">
            모든 플레이어의 비밀 역할, 최종 생존 상태, 개인 승리 달성 여부가 공개되었습니다.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {game.players.map((player) => {
            const role = player.roleId ? ROLES_DATA[player.roleId] : null;
            const style = role ? getTeamColor(role.team) : null;
            const isPersonalWinner = player.isPersonalWinner;

            return (
              <div
                key={player.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                  style ? `${style.border} ${style.bg}` : 'bg-zinc-900 border-zinc-800'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-base text-white">{player.nickname}</span>
                      {player.isHost && (
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-bold">
                          HOST
                        </span>
                      )}
                    </div>
                    {role && (
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="text-sm font-extrabold text-white">{role.name}</span>
                        {style && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${style.badge}`}>
                            {role.teamName}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Final Status Badge */}
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1 ${
                      player.status === 'ALIVE'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : player.status === 'DEAD'
                        ? 'bg-red-950 text-red-400 border border-red-800'
                        : 'bg-amber-950 text-amber-400 border border-amber-800'
                    }`}
                  >
                    {player.status === 'ALIVE' ? (
                      <>
                        <Heart className="w-3 h-3" /> 생존
                      </>
                    ) : player.status === 'DEAD' ? (
                      <>
                        <Skull className="w-3 h-3" /> 살해 사망
                      </>
                    ) : (
                      <>
                        <Ban className="w-3 h-3" /> 게임 제외
                      </>
                    )}
                  </span>
                </div>

                {/* Personal Victory Condition / Result */}
                <div className="border-t border-zinc-800/80 pt-2 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400 font-semibold">개인 결과:</span>
                    <span
                      className={`font-bold flex items-center gap-1 ${
                        isPersonalWinner ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {isPersonalWinner ? (
                        <>
                          <CheckCircle className="w-3.5 h-3.5" /> 승리
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5" /> 패배
                        </>
                      )}
                    </span>
                  </div>
                  {player.personalWinReason && (
                    <p className="text-[11px] text-zinc-300 leading-relaxed font-medium">
                      {player.personalWinReason}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Restart / Replay Option for Host */}
      {isHost && (
        <div className="pt-4 text-center">
          <button
            type="button"
            onClick={onRestart}
            disabled={isSubmitting}
            className="py-4 px-8 rounded-2xl bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white font-bold text-base shadow-xl shadow-red-950/60 transition-all inline-flex items-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" />
            새 게임 로비로 돌아가기
          </button>
        </div>
      )}
    </div>
  );
};
