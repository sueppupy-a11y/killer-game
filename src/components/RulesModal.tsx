import React, { useState } from 'react';
import { X, Shield, Skull, Eye, HelpCircle, BookOpen, MapPin, Users, Award } from 'lucide-react';
import { ROLES_DATA, getTeamColor } from '../rolesData';
import { TeamType } from '../types';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'roles' | 'rules' | 'rooms';
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose, initialTab = 'rules' }) => {
  const [activeTab, setActiveTab] = useState<'rules' | 'roles' | 'rooms'>(initialTab);
  const [selectedTeam, setSelectedTeam] = useState<TeamType | 'all'>('all');

  if (!isOpen) return null;

  const rolesList = Object.values(ROLES_DATA);
  const filteredRoles =
    selectedTeam === 'all' ? rolesList : rolesList.filter((r) => r.team === selectedTeam);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-zinc-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-red-500" />
            <h2 className="text-lg font-bold tracking-tight text-white">살인자 게임 가이드북</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-800 bg-zinc-900/30">
          <button
            onClick={() => setActiveTab('rules')}
            className={`flex-1 py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-2 border-b-2 ${
              activeTab === 'rules'
                ? 'border-red-500 text-red-400 bg-red-950/20'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            게임 진행 규칙
          </button>
          <button
            onClick={() => setActiveTab('roles')}
            className={`flex-1 py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-2 border-b-2 ${
              activeTab === 'roles'
                ? 'border-red-500 text-red-400 bg-red-950/20'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Users className="w-4 h-4" />
            12개 역할 사전
          </button>
          <button
            onClick={() => setActiveTab('rooms')}
            className={`flex-1 py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-2 border-b-2 ${
              activeTab === 'rooms'
                ? 'border-red-500 text-red-400 bg-red-950/20'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <MapPin className="w-4 h-4" />
            6개 공간 안내
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm text-zinc-300">
          {activeTab === 'rules' && (
            <div className="space-y-6">
              {/* Overview */}
              <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
                <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-400" />
                  게임 개요
                </h3>
                <p className="leading-relaxed text-zinc-300">
                  총 12명의 플레이어가 참여하는 오프라인 마피아·심리 추리 보조 게임입니다.
                  시민 6명, 살인마 진영 3명, 중립 진영 3명으로 구성되며, 각자의 비밀 역할을 숨긴 채 6개의 방을 이동하며 치열한 수사와 심리전을 펼칩니다.
                </p>
              </div>

              {/* Round Flow */}
              <div className="space-y-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-red-400" />
                  라운드 진행 단계 (최대 10라운드)
                </h3>
                <div className="grid grid-cols-1 gap-2.5">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/80">
                    <span className="px-2 py-0.5 text-xs font-bold bg-zinc-800 text-red-400 rounded">STEP 1</span>
                    <div>
                      <div className="font-semibold text-zinc-200">라운드 시작 & 방 선택</div>
                      <div className="text-xs text-zinc-400 mt-0.5">모든 생존 플레이어가 A~F 중 이동할 비밀 방을 선택하고 확정합니다.</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/80">
                    <span className="px-2 py-0.5 text-xs font-bold bg-zinc-800 text-red-400 rounded">STEP 2</span>
                    <div>
                      <div className="font-semibold text-zinc-200">방 이동 & 직업 행동 처리</div>
                      <div className="text-xs text-zinc-400 mt-0.5">선택이 마감되면 플레이어들이 각 방으로 이동하고 역할별 행동이 진행됩니다.</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/80">
                    <span className="px-2 py-0.5 text-xs font-bold bg-zinc-800 text-red-400 rounded">STEP 3</span>
                    <div>
                      <div className="font-semibold text-zinc-200">결과 확인 & 자유 토론</div>
                      <div className="text-xs text-zinc-400 mt-0.5">공개 사건(사망, 체포 등)을 확인하고 오프라인에서 자유롭게 토론 및 추리를 나눕니다.</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/80">
                    <span className="px-2 py-0.5 text-xs font-bold bg-zinc-800 text-red-400 rounded">STEP 4</span>
                    <div>
                      <div className="font-semibold text-zinc-200">경찰 체포 또는 다음 라운드</div>
                      <div className="text-xs text-zinc-400 mt-0.5">경찰은 결정적인 순간에 용의자를 체포할 수 있으며, 방장이 다음 라운드를 진행합니다.</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Victory Conditions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-800/50">
                  <div className="font-bold text-blue-400 mb-1 flex items-center gap-1.5">
                    <Shield className="w-4 h-4" />
                    시민 승리
                  </div>
                  <div className="text-xs text-zinc-300 leading-relaxed">
                    경찰이 진짜 살인마를 찾아 정확히 체포하거나 살인마 세력을 무력화했을 때.
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-red-950/30 border border-red-800/50">
                  <div className="font-bold text-red-400 mb-1 flex items-center gap-1.5">
                    <Skull className="w-4 h-4" />
                    살인마 승리
                  </div>
                  <div className="text-xs text-zinc-300 leading-relaxed">
                    체포되지 않고 10라운드까지 생존하거나 모든 시민 세력을 제거했을 때.
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-800/50">
                  <div className="font-bold text-purple-400 mb-1 flex items-center gap-1.5">
                    <Eye className="w-4 h-4" />
                    중립 승리
                  </div>
                  <div className="text-xs text-zinc-300 leading-relaxed">
                    소매치기, 사이코패스, 도박꾼의 독자적 조건 또는 관리자 설정 조건 달성.
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'roles' && (
            <div className="space-y-4">
              {/* Filter Pills */}
              <div className="flex gap-2 pb-2">
                <button
                  onClick={() => setSelectedTeam('all')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    selectedTeam === 'all' ? 'bg-zinc-200 text-zinc-950' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                  }`}
                >
                  전체 (12)
                </button>
                <button
                  onClick={() => setSelectedTeam('citizen')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    selectedTeam === 'citizen' ? 'bg-blue-600 text-white' : 'bg-zinc-900 text-blue-400 hover:bg-zinc-800'
                  }`}
                >
                  시민 진영 (6)
                </button>
                <button
                  onClick={() => setSelectedTeam('killer')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    selectedTeam === 'killer' ? 'bg-red-600 text-white' : 'bg-zinc-900 text-red-400 hover:bg-zinc-800'
                  }`}
                >
                  살인마 진영 (3)
                </button>
                <button
                  onClick={() => setSelectedTeam('neutral')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    selectedTeam === 'neutral' ? 'bg-purple-600 text-white' : 'bg-zinc-900 text-purple-400 hover:bg-zinc-800'
                  }`}
                >
                  중립 진영 (3)
                </button>
              </div>

              {/* Roles List */}
              <div className="grid grid-cols-1 gap-3">
                {filteredRoles.map((role) => {
                  const style = getTeamColor(role.team);
                  return (
                    <div
                      key={role.id}
                      className={`p-4 rounded-xl border ${style.border} ${style.bg} transition-all`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold text-white">{role.name}</span>
                          <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${style.badge}`}>
                            {role.teamName}
                          </span>
                        </div>
                        <span className="text-xs text-zinc-400 font-mono italic">{role.tagline}</span>
                      </div>
                      <p className="text-xs text-zinc-300 leading-relaxed mb-2.5">{role.description}</p>
                      <div className="pt-2 border-t border-zinc-800/80 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-zinc-400 font-medium">🎯 승리 목표: </span>
                          <span className="text-zinc-200">{role.winCondition}</span>
                        </div>
                        {role.abilityName && (
                          <div>
                            <span className="text-zinc-400 font-medium">⚡ 특수 행동: </span>
                            <span className="text-zinc-200">
                              {role.abilityName} ({role.abilityDescription})
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'rooms' && (
            <div className="space-y-4">
              <p className="text-xs text-zinc-400">
                매 라운드 모든 생존 플레이어는 6개의 방 중 1곳을 비밀리에 선택하여 이동합니다.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { id: 'A', name: 'A ROOM', desc: '중앙 통로와 인접한 개방형 구역' },
                  { id: 'B', name: 'B ROOM', desc: '의무실 및 연구 도구가 비치된 공간' },
                  { id: 'C', name: 'C ROOM', desc: '통신 및 보안 제어 장비가 있는 구역' },
                  { id: 'D', name: 'D ROOM', desc: '폐쇄적인 격리실 및 기록 보관소' },
                  { id: 'E', name: 'E ROOM', desc: '비상 발전기 및 기계 시설이 위치한 방' },
                  { id: 'F', name: 'F ROOM', desc: '외부 통로와 연결된 어두운 창고' },
                ].map((room) => (
                  <div
                    key={room.id}
                    className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-center hover:border-zinc-700 transition-colors"
                  >
                    <div className="text-2xl font-black text-red-500 mb-1">{room.id}</div>
                    <div className="font-bold text-white text-sm mb-1">{room.name}</div>
                    <div className="text-xs text-zinc-400">{room.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-800 bg-zinc-900/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-semibold rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
