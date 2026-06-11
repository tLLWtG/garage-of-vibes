export const GRID = 5;
export const CELLS = GRID * GRID;

export type SeedId =
  | 'gate'
  | 'copper'
  | 'ember'
  | 'dew'
  | 'glimmer'
  | 'heart'
  | 'briar'
  | 'mistbell'
  | 'crownseed'
  | 'steamroot'
  | 'ironbur'
  | 'lumenheart'
  | 'blight'
  | 'worldheart';

export type Rarity = 'basic' | 'uncommon' | 'rare' | 'hybrid' | 'cursed' | 'legend';

export type RoomKind =
  | 'entrance'
  | 'combat'
  | 'spring'
  | 'treasure'
  | 'power'
  | 'briar'
  | 'event'
  | 'boss'
  | 'curse';

export type WeatherId =
  | 'sun'
  | 'rain'
  | 'drought'
  | 'fog'
  | 'frost'
  | 'harvest';

export interface WeatherDef {
  id: WeatherId;
  name: string;
  desc: string;
  /** 开季水量修正 */
  waterBonus: number;
  /** 房间精华倍率 */
  essenceMult: number;
  /** 奖励倍率加成（加法） */
  rewardMultAdd: number;
  /** 敌人攻击修正 */
  enemyAtkAdd: number;
  /** 敌人生命倍率 */
  enemyHpMult: number;
  /** 泉水/温泉治疗修正 */
  healAdd: number;
  /** 种子额外掉落概率加成 */
  dropBonus: number;
}

/** 下潜时烘焙的全局修正（天气 + 灾厄威压），整局不变 */
export interface RunMods {
  essenceMult: number;
  dropBonus: number;
  healAdd: number;
  enemyAtkAdd: number;
  enemyHpMult: number;
}

export interface SeedDef {
  id: SeedId;
  name: string;
  roomName: string;
  tagline: string;
  effectDesc: string;
  color: string;
  rarity: Rarity;
  /** null = 不可购买 */
  cost: number | null;
  kind: RoomKind;
}

export interface FarmPlot {
  unlocked: boolean;
  seed: SeedId | null;
  /** 1..3，种下时为 1 */
  maturity: number;
}

/** 种植阶段对每个地块计算出的邻接效应（实时预览与收获结算共用） */
export interface PlotEffect {
  watered: number;
  ignited: boolean;
  briarN: number;
  guarded: boolean;
  effMaturity: number;
  reachable: boolean;
}

export type EnemyKind =
  | 'sprout'
  | 'beetle'
  | 'emberling'
  | 'guardian'
  | 'ironshell'
  | 'rootlord'
  | 'worldheart';

export type Intent = 'attack' | 'charge' | 'smash' | 'summon';

export interface Enemy {
  key: string;
  kind: EnemyKind;
  name: string;
  hp: number;
  maxHp: number;
  atk: number;
  intent: Intent;
  ignited: boolean;
  /** Boss 固定意图循环的位置 */
  patternIdx?: number;
  /** 大地之心半血狂暴 */
  enraged?: boolean;
}

export interface Room {
  x: number;
  y: number;
  key: string;
  kind: RoomKind;
  seedId: SeedId;
  maturity: number;
  ignited: boolean;
  guarded: boolean;
  briarN: number;
  depth: number;
  rewardMult: number;
  cleared: boolean;
  enemies: Enemy[];
}

export type BuffId =
  | 'might'
  | 'bark'
  | 'swift'
  | 'thorns'
  | 'satchel'
  | 'leech'
  | 'might2'
  | 'bark2'
  | 'swift2'
  | 'thorns2'
  | 'satchel2'
  | 'leech2';

export interface BuffDef {
  id: BuffId;
  name: string;
  desc: string;
}

export type BuildingId = 'greenhouse' | 'threshing' | 'herbplot' | 'watchtower';

export interface BuildingDef {
  id: BuildingId;
  name: string;
  desc: string;
  cost: number;
}

export type EventId = 'well' | 'bloodvine' | 'stele' | 'ghostTrader' | 'collapse';

export interface EventDef {
  id: EventId;
  title: string;
  desc: string;
  accept: string;
  decline: string;
}

/** 杂交反应：a 与 b 相邻且双方有效成熟度满级时产出 result */
export interface HybridPair {
  a: number;
  b: number;
  result: SeedId;
}

export interface LootResult {
  essence: number;
  seeds: Partial<Record<SeedId, number>>;
}

export type LogTone = 'info' | 'good' | 'bad' | 'loot';

export interface LogEntry {
  id: number;
  text: string;
  tone: LogTone;
}

export interface RunState {
  rooms: Record<string, Room>;
  pos: string;
  entranceKey: string;
  hp: number;
  maxHp: number;
  atk: number;
  potions: number;
  buffs: BuffId[];
  thorns: number;
  leech: number;
  heavyCdMax: number;
  heavyCd: number;
  /** 战斗中的房间 key，null = 不在战斗 */
  combatRoom: string | null;
  /** 撤退时退回的房间 */
  prevPos: string | null;
  /** 能力房三选一，null = 无待选 */
  powerChoice: BuffId[] | null;
  /** 事件房当前待抉择的事件 */
  eventId: EventId | null;
  /** 本局全局修正（天气 + 威压烘焙） */
  mods: RunMods;
  /** 本局击败了大地之心 */
  slainWorldheart?: boolean;
  gainedEssence: number;
  gainedSeeds: Partial<Record<SeedId, number>>;
  deepest: number;
  log: LogEntry[];
}

export interface ResultSummary {
  died: boolean;
  perfect: boolean;
  /** 击败大地之心的通关结算 */
  victory: boolean;
  essence: number;
  seeds: Partial<Record<SeedId, number>>;
  bonusSeed: SeedId | null;
  clearedRooms: number;
  totalRooms: number;
  deepest: number;
  season: number;
}

export interface MilestoneDef {
  id: string;
  name: string;
  desc: string;
  reward: number;
}

export type Phase = 'farm' | 'dungeon' | 'result';

export type Tool =
  | { type: 'seed'; id: SeedId }
  | { type: 'water' }
  | { type: 'shovel' }
  | null;

export type CombatAction = 'attack' | 'heavy' | 'guard' | 'potion' | 'flee';

export const keyOf = (x: number, y: number) => `${x},${y}`;
export const idxToXY = (idx: number) => ({ x: idx % GRID, y: Math.floor(idx / GRID) });
