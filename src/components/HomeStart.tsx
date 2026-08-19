import React, { useEffect, useState } from 'react';
import { Shield, Skull, Eye, Plus, LogIn, HelpCircle, BookOpen, Users, Play } from 'lucide-react';

interface HomeStartProps {
  onCreateGame: (nickname: string) => Promise<void>;
  onJoinGame: (gameId: string, nickname: string) => Promise<void>;
  onOpenRules: (tab: 'rules' | 'roles' | 'rooms') => void;
  isSubmitting: boolean;
  initialCode?: string;
}

export const HomeStart: React.FC<HomeStartProps> = ({
  onCreateGame,
  onJoinGame,
  onOpenRules,
  isSubmitting,
  initialCode = '',
}) => {
  const [modalMode, setModalMode] = useState<'create' | 'join' | null>(
    initialCode ? 'join' : null
  );
  const [nickname, setNickname] = useState('');
  const [gameCode, setGameCode] = useState(initialCode);
  const [errorMsg, setErrorMsg] = useState('');

  // App reads ?code=ABC123 after the first render, so sync the invite code into this form.
  useEffect(() => {
    if (!initialCode) return;
    setGameCode(initialCode.toUpperCase());
    setModalMode('join');
  }, [initialCode]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) {
      setErrorMsg('닉네임을 입력해주세요.');
      return;
    }
    setErrorMsg('');
    try {
      await onCreateGame(nickname.trim());
    } catch (err: any) {
      setErrorMsg(err.message || '게임 생성에 실패했습니다.');
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) {
      setErrorMsg('닉네임을 입력해주세요.');
      return;
    }
    if (!gameCode.trim()) {
      setErrorMsg('6자리 게임 코드를 입력해주세요.');
      return;
    }
    setErrorMsg('');
    try {
      await onJoinGame(gameCode.trim().toUpperCase(), nickname.trim());
    } catch (err: any) {
      setErrorMsg(err.message || '게임 참가에 실패했습니다.');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center justify-center min-h-[80vh] px-4 py-8 space-y-8 animate-fadeIn">
      {/* Title & Brand Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-950/50 border border-red-900/60 text-red-400 text-xs font-bold tracking-widest uppercase">
          <Skull className="w-4 h-4" /> 12인 마피아 · 심리 추리
        </div>

        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white drop-shadow-lg">
          살인자 <span className="text-red-600">게임</span>
        </h1>

        <p className="text-xs sm:text-sm text-zinc-400 max-w-xs mx-auto leading-relaxed">
          12명의 플레이어, 6개의 비밀 방. 당신의 정체를 숨기고 끝까지 살아남아 승리하십시오.
        </p>
      </div>

      {/* Main Action Menu Buttons */}
      <div className="w-full space-y-3">
        {/* Create Game */}
        <button
          type="button"
          onClick={() => {
            setModalMode('create');
            setErrorMsg('');
          }}
          className="w-full py-4 px-6 rounded-2xl bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white font-bold text-base shadow-xl shadow-red-950/60 transition-all flex items-center justify-center gap-3 cursor-pointer group"
        >
          <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
          <span>새 게임 만들기</span>
        </button>

        {/* Join Game */}
        <button
          type="button"
          onClick={() => {
            setModalMode('join');
            setErrorMsg('');
          }}
          className="w-full py-4 px-6 rounded-2xl bg-zinc-900 hover:bg-zinc-850 active:scale-[0.98] border border-zinc-750 hover:border-zinc-600 text-zinc-100 font-bold text-base shadow-lg transition-all flex items-center justify-center gap-3 cursor-pointer"
        >
          <LogIn className="w-5 h-5 text-blue-400" />
          <span>게임 참가하기</span>
        </button>

        {/* Secondary Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={() => onOpenRules('rules')}
            className="py-3 px-4 rounded-xl bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2"
          >
            <HelpCircle className="w-4 h-4 text-zinc-400" />
            게임 방법
          </button>

          <button
            type="button"
            onClick={() => onOpenRules('roles')}
            className="py-3 px-4 rounded-xl bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2"
          >
            <BookOpen className="w-4 h-4 text-zinc-400" />
            역할 설명
          </button>
        </div>
      </div>

      {/* Factions Quick Badge Footer */}
      <div className="w-full pt-4 border-t border-zinc-900 grid grid-cols-3 gap-2 text-center text-[11px] font-bold">
        <div className="p-2 rounded-xl bg-blue-950/30 border border-blue-900/40 text-blue-400">
          시민 진영 (6명)
        </div>
        <div className="p-2 rounded-xl bg-red-950/30 border border-red-900/40 text-red-400">
          살인마 진영 (3명)
        </div>
        <div className="p-2 rounded-xl bg-purple-950/30 border border-purple-900/40 text-purple-400">
          중립 진영 (3명)
        </div>
      </div>

      {/* Create / Join Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-5 text-zinc-100">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                {modalMode === 'create' ? (
                  <>
                    <Plus className="w-5 h-5 text-red-500" /> 새 게임 방 만들기
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5 text-blue-400" /> 게임 방 참가하기
                  </>
                )}
              </h3>
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="text-zinc-400 hover:text-white text-xs font-bold"
              >
                취소
              </button>
            </div>

            <form
              onSubmit={modalMode === 'create' ? handleCreateSubmit : handleJoinSubmit}
              className="space-y-4"
            >
              {modalMode === 'join' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400">6자리 게임 코드</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={gameCode}
                    onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                    placeholder="예: K7B92A"
                    className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white font-mono text-center tracking-widest text-lg uppercase focus:outline-none focus:border-red-500"
                    autoFocus
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400">닉네임</label>
                <input
                  type="text"
                  maxLength={10}
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="사용할 닉네임 입력 (최대 10자)"
                  className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-sm focus:outline-none focus:border-red-500"
                  autoFocus={modalMode === 'create'}
                />
              </div>

              {errorMsg && (
                <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-800 text-xs text-red-300">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white font-bold text-sm transition-all shadow-lg shadow-red-950 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <span>처리 중...</span>
                ) : modalMode === 'create' ? (
                  <>
                    <Play className="w-4 h-4 fill-current" /> 게임 방 생성
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" /> 방 입장
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
