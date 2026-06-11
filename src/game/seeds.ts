import type {
  BuffDef,
  BuffId,
  BuildingDef,
  BuildingId,
  SeedDef,
  SeedId,
} from './types';

export const SEEDS: Record<SeedId, SeedDef> = {
  gate: {
    id: 'gate',
    name: '门种',
    roomName: '地牢入口',
    tagline: '每季一颗 · 必须种下',
    effectDesc:
      '长成地牢的入口与撤离点。它在田里的位置，决定下方所有道路的起点——离它越远的房间越危险，奖励也越丰厚。',
    color: '#d8c08a',
    rarity: 'basic',
    cost: null,
    kind: 'entrance',
  },
  copper: {
    id: 'copper',
    name: '铜芽',
    roomName: '铜芽巢室',
    tagline: '基础战斗房',
    effectDesc:
      '长成栖息着芽虫的巢室。清剿后掉落精华与普通种子。靠近火帽会被点燃：敌人更凶，掉落 ×1.75。',
    color: '#9fd86b',
    rarity: 'basic',
    cost: 4,
    kind: 'combat',
  },
  dew: {
    id: 'dew',
    name: '露根',
    roomName: '泉水房',
    tagline: '回复生命 · 灌溉四邻',
    effectDesc:
      '长成一汪治愈泉水（回复 10 + 4×成熟度）。同时灌溉四个相邻地块，使它们的有效成熟度 +1。',
    color: '#6fc3ff',
    rarity: 'basic',
    cost: 5,
    kind: 'spring',
  },
  briar: {
    id: 'briar',
    name: '荆棘',
    roomName: '荆棘丛',
    tagline: '通行刺痛 · 增幅四邻',
    effectDesc:
      '长成带刺的活屏障：穿行受到 2 + 成熟度点伤害。相邻房间的奖励提升（每丛 +40%，至多 +120%）。用它围住宝物，也围住自己的路。',
    color: '#b18cff',
    rarity: 'uncommon',
    cost: 7,
    kind: 'briar',
  },
  heart: {
    id: 'heart',
    name: '心藤',
    roomName: '心藤龛',
    tagline: '三选一祝福',
    effectDesc:
      '长成低语的藤龛。踏入后从三种祝福中择其一，效果持续整次下潜。把它种在路径前段，让祝福护送全程。',
    color: '#f08bb8',
    rarity: 'uncommon',
    cost: 9,
    kind: 'power',
  },
  ember: {
    id: 'ember',
    name: '火帽',
    roomName: '燃焰窟',
    tagline: '高危战斗 · 点燃邻居',
    effectDesc:
      '长成燃魂出没的火窟，稀有种子掉率最高。会点燃所有相邻的铜芽巢室：被点燃的房间敌人更强，掉落 ×1.75。',
    color: '#ff8a5c',
    rarity: 'uncommon',
    cost: 9,
    kind: 'combat',
  },
  glimmer: {
    id: 'glimmer',
    name: '微光',
    roomName: '宝藏室',
    tagline: '丰厚奖励 · 招引守卫',
    effectDesc:
      '长成堆满精华的宝藏室，本不需战斗——但若相邻有任何战斗房，守卫会闻光而来看管宝藏：需要击败守卫，奖励 ×1.6。',
    color: '#ffd95c',
    rarity: 'rare',
    cost: 16,
    kind: 'treasure',
  },
  mistbell: {
    id: 'mistbell',
    name: '雾铃',
    roomName: '迷雾铃堂',
    tagline: '未知事件 · 主动赌运',
    effectDesc:
      '长成雾气缭绕的铃堂。踏入时雾中浮现一桩未知的际遇——献血、投币、交易或奇迹。种下它，就是主动买下一份不确定。',
    color: '#a8b8d8',
    rarity: 'uncommon',
    cost: 8,
    kind: 'event',
  },
  crownseed: {
    id: 'crownseed',
    name: '王种',
    roomName: '王座窟',
    tagline: 'Boss 战 · 王的财宝',
    effectDesc:
      '长成根须霸主的王座。它会攻击、蓄力、猛击，并不断召唤芽虫护驾。击败它可获得海量精华与高级种子——记得吃满深度加成再来收割。',
    color: '#e8c84b',
    rarity: 'rare',
    cost: 25,
    kind: 'boss',
  },
  steamroot: {
    id: 'steamroot',
    name: '蒸露',
    roomName: '蒸汽温泉',
    tagline: '杂交种 · 回满生命并强化',
    effectDesc:
      '露根与火帽的杂交种。长成翻腾的蒸汽温泉：完全回复生命，蒸汽淬炼使本次下潜攻击 +1。',
    color: '#8fd8c8',
    rarity: 'hybrid',
    cost: null,
    kind: 'spring',
  },
  ironbur: {
    id: 'ironbur',
    name: '铁棘',
    roomName: '铁棘精英巢',
    tagline: '杂交种 · 精英战 · 王种掉率高',
    effectDesc:
      '铜芽与荆棘的杂交种。长成铁壳卫驻守的精英巢室：敌人凶悍，但精华丰厚，且有概率掉落王种。',
    color: '#c8ccd8',
    rarity: 'hybrid',
    cost: null,
    kind: 'combat',
  },
  lumenheart: {
    id: 'lumenheart',
    name: '辉心',
    roomName: '辉光圣龛',
    tagline: '杂交种 · 强化祝福',
    effectDesc:
      '微光与心藤的杂交种。长成辉光圣龛，提供的三选一祝福远强于普通心藤龛。',
    color: '#ffe9a0',
    rarity: 'hybrid',
    cost: null,
    kind: 'power',
  },
  blight: {
    id: 'blight',
    name: '夜枯',
    roomName: '灾厄窟',
    tagline: '诅咒种 · 全场高危 · 暴利',
    effectDesc:
      '被诅咒的种子。田里只要种着一株，本次下潜所有敌人生命 +15%、攻击 +1（灾厄威压，不叠加）。它长成的灾厄窟踏入即受重伤，却埋着巨量精华与一颗稀有种子。种下它，就是亲手调高整局难度。',
    color: '#9b7bd8',
    rarity: 'cursed',
    cost: 6,
    kind: 'curse',
  },
  worldheart: {
    id: 'worldheart',
    name: '大地之心',
    roomName: '大地之心',
    tagline: '终局 Boss · 半血狂怒',
    effectDesc:
      '传说中所有地牢的母核。长成搏动的大地之心：生命过半时它会狂怒，攻击暴涨、循环更凶。战胜它即为通关——掉落海量精华与一把高级种子。',
    color: '#ff9d6f',
    rarity: 'legend',
    cost: 50,
    kind: 'boss',
  },
};

export const SEED_ORDER: SeedId[] = [
  'gate',
  'copper',
  'dew',
  'briar',
  'heart',
  'ember',
  'blight',
  'mistbell',
  'glimmer',
  'crownseed',
  'worldheart',
  'steamroot',
  'ironbur',
  'lumenheart',
];

export const ALL_SEED_IDS = SEED_ORDER;

/** 杂交表（无序对）：[亲本A, 亲本B, 产物] */
export const HYBRIDS: [SeedId, SeedId, SeedId][] = [
  ['dew', 'ember', 'steamroot'],
  ['copper', 'briar', 'ironbur'],
  ['glimmer', 'heart', 'lumenheart'],
];

export function hybridResult(a: SeedId, b: SeedId): SeedId | null {
  for (const [x, y, r] of HYBRIDS) {
    if ((a === x && b === y) || (a === y && b === x)) return r;
  }
  return null;
}

export const RARITY_LABEL: Record<string, string> = {
  basic: '普通',
  uncommon: '罕见',
  rare: '稀有',
  hybrid: '杂交',
  cursed: '诅咒',
  legend: '传说',
};

/** 大地之心的商店解锁条件 */
export const WORLDHEART_REQS = ['boss_slain', 'first_hybrid'];

export const BUFFS: Record<BuffId, BuffDef> = {
  might: { id: 'might', name: '力量之芽', desc: '攻击力 +2' },
  bark: { id: 'bark', name: '韧树皮', desc: '最大生命 +10，并回复 10' },
  swift: { id: 'swift', name: '急脉', desc: '重击冷却 -1（最低 1）' },
  thorns: { id: 'thorns', name: '荆鳞', desc: '受到攻击时反弹 2 点伤害' },
  satchel: { id: 'satchel', name: '药匠口袋', desc: '立即获得 2 瓶药水' },
  leech: { id: 'leech', name: '汲露须', desc: '攻击命中时回复 1 点生命' },
  might2: { id: 'might2', name: '巨力古藤', desc: '攻击力 +4' },
  bark2: { id: 'bark2', name: '铁桦之心', desc: '最大生命 +20，并回复 20' },
  swift2: { id: 'swift2', name: '雷走根脉', desc: '重击冷却 -2（最低 1）' },
  thorns2: { id: 'thorns2', name: '钢棘战甲', desc: '受到攻击时反弹 4 点伤害' },
  satchel2: { id: 'satchel2', name: '药神宝匣', desc: '获得 3 瓶药水，并回复 10' },
  leech2: { id: 'leech2', name: '深渊吸须', desc: '攻击命中时回复 2 点生命' },
};

/** 普通心藤龛祝福池 */
export const BUFF_IDS: BuffId[] = [
  'might',
  'bark',
  'swift',
  'thorns',
  'satchel',
  'leech',
];

/** 辉光圣龛的强化祝福池 */
export const EMPOWERED_BUFF_IDS: BuffId[] = [
  'might2',
  'bark2',
  'swift2',
  'thorns2',
  'satchel2',
  'leech2',
];

export const BUILDINGS: Record<BuildingId, BuildingDef> = {
  greenhouse: {
    id: 'greenhouse',
    name: '温室',
    desc: '每季开始时，赠送 1 颗随机基础种子（铜芽或露根）',
    cost: 25,
  },
  threshing: {
    id: 'threshing',
    name: '晒谷场',
    desc: '完美收割时，带回的精华额外 +15%',
    cost: 30,
  },
  herbplot: {
    id: 'herbplot',
    name: '药圃',
    desc: '泉水与温泉的治疗效果 +5',
    cost: 35,
  },
  watchtower: {
    id: 'watchtower',
    name: '瞭望塔',
    desc: '从战斗中撤退时，不再受到敌人的拦截攻击',
    cost: 45,
  },
};

export const BUILDING_ORDER: BuildingId[] = [
  'greenhouse',
  'threshing',
  'herbplot',
  'watchtower',
];
