import { RoleDefinition, RoleId } from './types';

export const ROLES: Record<RoleId, RoleDefinition> = {
  killer: {
    id: 'killer', name: '살인마', emoji: '🔪', team: 'killer', teamName: '살인마 진영',
    shortDescription: '밤마다 시민 한 명을 제거합니다.',
    abilityName: '살해', abilityDescription: '밤마다 한 명을 선택합니다. 살인마가 죽으면 생존한 살인마 진영이 살해 권한을 이어받습니다.', actionTiming: 'night',
  },
  spy: {
    id: 'spy', name: '스파이', emoji: '🕵️', team: 'killer', teamName: '살인마 진영',
    shortDescription: '특수능력을 가진 시민을 찾아냅니다.',
    abilityName: '신분 탐색', abilityDescription: '밤마다 한 명을 조사해 특수능력 보유 여부를 확인합니다. 살해 권한을 승계하면 탐색 대신 살해합니다.', actionTiming: 'night',
  },
  accomplice: {
    id: 'accomplice', name: '공범', emoji: '😈', team: 'killer', teamName: '살인마 진영',
    shortDescription: '시민의 밤 능력을 방해합니다.',
    abilityName: '방해', abilityDescription: '밤마다 한 명을 선택해 그 사람의 밤 능력을 실패시킵니다. 살해 권한을 승계하면 방해 대신 살해합니다.', actionTiming: 'night',
  },
  police: {
    id: 'police', name: '경찰', emoji: '👮', team: 'citizen', teamName: '시민 진영',
    shortDescription: '한 명이 살인마 진영인지 확인합니다.',
    abilityName: '조사', abilityDescription: '밤마다 한 명을 조사해 살인마 진영인지 확인합니다.', actionTiming: 'night',
  },
  doctor: {
    id: 'doctor', name: '의사', emoji: '🩺', team: 'citizen', teamName: '시민 진영',
    shortDescription: '밤의 공격에서 한 명을 보호합니다.',
    abilityName: '치료', abilityDescription: '밤마다 한 명을 보호합니다. 그 사람이 공격받으면 살아남습니다.', actionTiming: 'night',
  },
  bodyguard: {
    id: 'bodyguard', name: '경호원', emoji: '🛡️', team: 'citizen', teamName: '시민 진영',
    shortDescription: '공격받는 사람 대신 희생할 수 있습니다.',
    abilityName: '경호', abilityDescription: '밤마다 한 명을 경호합니다. 그 사람이 공격받으면 대신 공격을 받습니다.', actionTiming: 'night',
  },
  detective: {
    id: 'detective', name: '탐정', emoji: '👣', team: 'citizen', teamName: '시민 진영',
    shortDescription: '한 명이 밤에 누구를 찾아갔는지 추적합니다.',
    abilityName: '추적', abilityDescription: '밤마다 한 명을 추적해 그 사람이 누구에게 능력을 사용했는지 확인합니다.', actionTiming: 'night',
  },
  psychic: {
    id: 'psychic', name: '초감각자', emoji: '🔮', team: 'citizen', teamName: '시민 진영',
    shortDescription: '한 명이 밤에 능력을 사용했는지 감지합니다.',
    abilityName: '감지', abilityDescription: '밤마다 한 명을 선택해 그 사람이 실제로 능력을 사용했는지 확인합니다.', actionTiming: 'night',
  },
  mayor: {
    id: 'mayor', name: '시장', emoji: '👑', team: 'citizen', teamName: '시민 진영',
    shortDescription: '정체를 공개하면 투표권이 2표가 됩니다.',
    abilityName: '시장 공개', abilityDescription: '낮 대화 시간에 한 번 정체를 공개할 수 있습니다. 이후 투표가 2표로 계산됩니다.', actionTiming: 'day',
  },
  citizen: {
    id: 'citizen', name: '시민', emoji: '👤', team: 'citizen', teamName: '시민 진영',
    shortDescription: '대화와 투표로 살인마를 찾아냅니다.',
    abilityName: '추리와 투표', abilityDescription: '특수능력은 없지만 낮 토론과 투표가 가장 중요합니다.', actionTiming: 'none',
  },
};

export const ROLE_POOL: RoleId[] = [
  'killer', 'spy', 'accomplice',
  'police', 'doctor', 'bodyguard', 'detective', 'psychic', 'mayor',
  'citizen', 'citizen', 'citizen',
];

export const roleLabel = (id?: RoleId) => id ? `${ROLES[id].emoji} ${ROLES[id].name}` : '미공개';
