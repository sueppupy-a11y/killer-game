import { RoleDefinition, RolePreset, RoomId } from './types';

export const ALL_ROOMS: RoomId[] = ['A', 'B', 'C', 'D', 'E', 'F'];

export const ROLES_DATA: Record<string, RoleDefinition> = {
  // === 살인마 진영 (3명) ===
  killer: {
    id: 'killer',
    name: '살인마',
    team: 'killer',
    teamName: '살인마 진영',
    tagline: '어둠 속 1:1 고립을 노리는 잔혹한 포식자',
    description:
      '일반 방(A~F)에서 다른 플레이어와 정확히 1:1로 단둘이 배정되면 살해할 수 있습니다. 단, 3명 이상이거나 보호 대상이면 살인이 성립하지 않습니다.',
    winCondition:
      '총 3회 살인에 성공하거나 10라운드 최종 투표에서 지목되지 않고 승리하십시오.',
    abilityName: '1:1 밀실 살인 (패시브)',
    abilityDescription: '방에 정확히 2명만 존재할 때 상대 살해 (총 3회 살인 성공 시 진영 승리)',
    abilityMaxUses: 10,
    abilityCondition: '일반 방 1:1 배정 시 자동 발동',
  },
  follower: {
    id: 'follower',
    name: '추종자',
    team: 'killer',
    teamName: '살인마 진영',
    tagline: '살인마를 숭배하고 엄호하는 비밀 조력자',
    description:
      '살인마를 돕는 조력자입니다. 일반 방(A~F)에서 살인마와 단둘이 있어도 살해당하지 않습니다 (단, 감옥에서는 보호되지 않음).',
    winCondition: '살인마가 체포되지 않고 살인마 진영 승리 조건을 달성하도록 도우십시오.',
    abilityName: '살인마의 비호 (패시브)',
    abilityDescription: '일반 방에서 살인마와 1:1이어도 살해당하지 않음 (감옥 제외)',
    abilityMaxUses: 0,
    abilityCondition: '항시 적용',
  },
  corrupt_police: {
    id: 'corrupt_police',
    name: '부패경찰',
    team: 'killer',
    teamName: '살인마 진영',
    tagline: '동귀어진으로 시민 핵심직을 제거하는 내부의 첩자',
    description:
      '살인마를 돕는 특수 체포 역할입니다. 생존자 1명을 지목해 체포할 수 있으나, 대상과 자신 모두 게임에서 동귀어진으로 영구 제외(REMOVED)됩니다.',
    winCondition: '경찰이나 주요 시민 정보직을 제거하여 살인마 진영의 승리를 이끄십시오.',
    abilityName: '동귀어진 체포',
    abilityDescription: '생존자 1명을 지목하여 본인과 대상을 함께 게임에서 영구 제외(REMOVED)시킵니다.',
    abilityMaxUses: 1,
    abilityCondition: '게임 중 1회 사용 가능',
  },

  // === 시민 진영 (6명) ===
  police: {
    id: 'police',
    name: '경찰',
    team: 'citizen',
    teamName: '시민 진영',
    tagline: '살인마를 단번에 제압할 정의의 수사관',
    description:
      '생존 플레이어 1명을 살인마로 지목해 체포할 수 있습니다. 살인마를 맞추면 즉시 시민 진영 승리! 빗나가면 대상과 경찰 본인이 게임에서 제외(REMOVED)됩니다. 일반 방에서 살인마의 공격을 받으면 비밀 경보를 받으며 생존합니다.',
    winCondition: '진짜 살인마를 찾아 정확히 체포하거나 최종 투표에서 살인마를 지목하십시오.',
    abilityName: '살인마 지목 체포',
    abilityDescription: '살인마 검거 성공 시 즉시 승리! 오검거 시 대상과 경찰 모두 제외(REMOVED)',
    abilityMaxUses: 1,
    abilityCondition: '생존 중 1회 사용 가능',
  },
  forensic: {
    id: 'forensic',
    name: '법의학자',
    team: 'citizen',
    teamName: '시민 진영',
    tagline: '사망 사건 현장에서 단서를 복원하는 감식관',
    description:
      '살인 사건이 발생하면 다음 라운드 낮에 법의학자 본인에게만 비밀 단서/증거가 주어집니다. 이를 시민들과 공유할지 숨길지 직접 결정합니다.',
    winCondition: '사망 현장 단서를 바탕으로 살인마의 동선과 정체를 밝혀내십시오.',
    abilityName: '사건 현장 감식 (패시브)',
    abilityDescription: '살인 발생 시 다음 라운드 낮 단계에서 비밀 단서 획득',
    abilityMaxUses: 5,
    abilityCondition: '살인 발생 시 다음 라운드 발동',
  },
  witness: {
    id: 'witness',
    name: '목격자',
    team: 'citizen',
    teamName: '시민 진영',
    tagline: '살인의 현장을 은밀히 목격한 자',
    description:
      '살인이 발생한 라운드에 비밀 목격 단서(의심 구역/동선 힌트)를 획득합니다. 다른 사람에게 자동 공개되지 않으므로 직접 신빙성을 입증해야 합니다.',
    winCondition: '목격한 단서를 수사에 제공하여 살인마를 검거하도록 도우십시오.',
    abilityName: '살인 현장 목격 (패시브)',
    abilityDescription: '살인 발생 라운드에 비밀 목격 단서 획득',
    abilityMaxUses: 5,
    abilityCondition: '살인 발생 라운드 즉시 발동',
  },
  psychic: {
    id: 'psychic',
    name: '초감각자',
    team: 'citizen',
    teamName: '시민 진영',
    tagline: '방의 거짓 없는 실제 인원수를 꿰뚫어 보는 감각',
    description:
      '결과 토론 단계에서 자신이 배정받은 방의 실제 인원수를 정확하게 확인할 수 있습니다 (플레이어의 거짓 주장 간파 가능).',
    winCondition: '인원수 정보를 활용해 거짓말하는 용의자를 추려내십시오.',
    abilityName: '실제 인원수 감지 (패시브)',
    abilityDescription: '배정된 방의 실제 인원수를 본인 화면에만 정확히 표시',
    abilityMaxUses: 10,
    abilityCondition: '결과 확인 단계 자동 발동',
  },
  warden: {
    id: 'warden',
    name: '교도관',
    team: 'citizen',
    teamName: '시민 진영',
    tagline: '의심되는 자를 감옥에 격리하는 교정 집행관',
    description:
      '방 선택이 끝난 뒤 플레이어 1명을 선택해 이번 라운드 동안 감옥(PRISON)으로 보낼 수 있습니다. 대상이 탈옥권을 사용하면 원래 선택한 방으로 복귀합니다.',
    winCondition: '위험 인물을 격리하고 시민들을 보호하여 승리를 이끄십시오.',
    abilityName: '감옥 수감 지정',
    abilityDescription: '방 선택 후 1명을 감옥으로 격리 (미사용 가능)',
    abilityMaxUses: 10,
    abilityCondition: '매 라운드 방 선택 후 특수능력 단계',
  },
  citizen: {
    id: 'citizen',
    name: '일반시민',
    team: 'citizen',
    teamName: '시민 진영',
    tagline: '투표와 논리로 살인마를 압박하는 시민',
    description:
      '특별한 액티브 능력은 없으나, 정직한 방 배정 정보와 심리 추리를 통해 살인마를 찾아내는 핵심 다수 세력입니다.',
    winCondition: '살인마에게 살해되지 않고 생존하여 경찰의 체포와 최종 투표를 이끄십시오.',
    abilityName: null,
    abilityDescription: null,
    abilityMaxUses: 0,
    abilityCondition: null,
  },

  // === 중립 진영 (3명) ===
  pickpocket: {
    id: 'pickpocket',
    name: '소매치기',
    team: 'neutral',
    teamName: '중립 진영',
    tagline: '1:1 밀실에서 상대의 주머니를 터는 은밀한 손',
    description:
      '일반 방에서 다른 플레이어와 정확히 1:1로 배정되면 절도에 성공합니다. 총 3회 절도에 성공하고 게임 종료 시까지 생존해야 개인 승리합니다.',
    winCondition: '총 3회 절도 성공 + 게임 종료 시 생존 (개인 승리)',
    abilityName: '1:1 밀실 절도 (패시브)',
    abilityDescription: '일반 방 1:1 배정 시 절도 성공 (3회 달성 + 생존 시 개인 승리)',
    abilityMaxUses: 10,
    abilityCondition: '일반 방 1:1 배정 시 자동 발동',
  },
  psychopath: {
    id: 'psychopath',
    name: '사이코패스',
    team: 'neutral',
    teamName: '중립 진영',
    tagline: '피의 참극 속에서 살아남는 것을 즐기는 자',
    description:
      '살인마가 총 3회의 살인을 성공하도록 유도하고, 자신은 게임 종료 시까지 끝까지 살아남아야 개인 승리합니다.',
    winCondition: '살인마 살인 3회 이상 달성 + 본인 끝까지 생존 (개인 승리)',
    abilityName: '광기의 생존 (패시브)',
    abilityDescription: '살인마의 살인이 3회 누적되고 본인이 생존하면 개인 승리',
    abilityMaxUses: 0,
    abilityCondition: '상시 적용',
  },
  gambler: {
    id: 'gambler',
    name: '도박꾼',
    team: 'neutral',
    teamName: '중립 진영',
    tagline: '승리할 진영에 모든 것을 거는 승부사',
    description:
      '게임 시작 시 시민 진영 또는 살인마 진영 중 승리할 진영을 비밀리에 베팅합니다. 베팅한 진영이 승리하고 본인이 생존하면 개인 승리합니다.',
    winCondition: '비밀 베팅한 진영 승리 + 본인 끝까지 생존 (개인 승리)',
    abilityName: '승리 진영 베팅',
    abilityDescription: '게임 시작 시 시민 또는 살인마 승리에 베팅',
    abilityMaxUses: 1,
    abilityCondition: '게임 시작 시 1회',
  },
};

export const FIXED_ROLES_PRESET: RolePreset[] = [
  { slotNumber: 1, roleId: 'killer', roleName: '살인마' },
  { slotNumber: 2, roleId: 'follower', roleName: '추종자' },
  { slotNumber: 3, roleId: 'corrupt_police', roleName: '부패경찰' },
  { slotNumber: 4, roleId: 'police', roleName: '경찰' },
  { slotNumber: 5, roleId: 'forensic', roleName: '법의학자' },
  { slotNumber: 6, roleId: 'witness', roleName: '목격자' },
  { slotNumber: 7, roleId: 'psychic', roleName: '초감각자' },
  { slotNumber: 8, roleId: 'warden', roleName: '교도관' },
  { slotNumber: 9, roleId: 'citizen', roleName: '일반시민' },
  { slotNumber: 10, roleId: 'pickpocket', roleName: '소매치기' },
  { slotNumber: 11, roleId: 'psychopath', roleName: '사이코패스' },
  { slotNumber: 12, roleId: 'gambler', roleName: '도박꾼' },
];

export const ROLE_IDS_POOL = [
  'killer',
  'follower',
  'corrupt_police',
  'police',
  'forensic',
  'witness',
  'psychic',
  'warden',
  'citizen',
  'pickpocket',
  'psychopath',
  'gambler',
];

export function getTeamColor(team?: string): {
  bg: string;
  text: string;
  border: string;
  badge: string;
  accent: string;
} {
  switch (team) {
    case 'citizen':
      return {
        bg: 'bg-blue-950/40',
        text: 'text-blue-400',
        border: 'border-blue-700/60',
        badge: 'bg-blue-600 text-white',
        accent: '#3b82f6',
      };
    case 'killer':
      return {
        bg: 'bg-red-950/40',
        text: 'text-red-400',
        border: 'border-red-700/60',
        badge: 'bg-red-600 text-white',
        accent: '#ef4444',
      };
    case 'neutral':
      return {
        bg: 'bg-purple-950/40',
        text: 'text-purple-400',
        border: 'border-purple-700/60',
        badge: 'bg-purple-600 text-white',
        accent: '#a855f7',
      };
    default:
      return {
        bg: 'bg-zinc-900',
        text: 'text-zinc-300',
        border: 'border-zinc-700',
        badge: 'bg-zinc-700 text-white',
        accent: '#71717a',
      };
  }
}
