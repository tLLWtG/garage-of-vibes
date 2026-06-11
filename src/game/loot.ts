import type { LootResult, Room, RunMods, SeedId } from './types';

export const NO_RUN_MODS: RunMods = {
  essenceMult: 1,
  dropBonus: 0,
  healAdd: 0,
  enemyAtkAdd: 0,
  enemyHpMult: 1,
};

type LootTable = [SeedId, number][];

/** 各房间的种子掉落表：种 A 收 B，火与宝藏产出更高级的种子 */
const TABLES: Partial<Record<SeedId, LootTable>> = {
  copper: [
    ['copper', 0.55],
    ['dew', 0.2],
    ['heart', 0.12],
    ['briar', 0.08],
    ['ember', 0.05],
  ],
  ember: [
    ['ember', 0.3],
    ['briar', 0.2],
    ['heart', 0.18],
    ['copper', 0.12],
    ['glimmer', 0.12],
    ['dew', 0.08],
  ],
  glimmer: [
    ['glimmer', 0.2],
    ['heart', 0.2],
    ['ember', 0.17],
    ['briar', 0.14],
    ['dew', 0.12],
    ['copper', 0.11],
    ['crownseed', 0.06],
  ],
  ironbur: [
    ['ember', 0.24],
    ['briar', 0.2],
    ['heart', 0.2],
    ['glimmer', 0.16],
    ['copper', 0.12],
    ['crownseed', 0.08],
  ],
  crownseed: [
    ['glimmer', 0.24],
    ['ember', 0.22],
    ['heart', 0.18],
    ['briar', 0.13],
    ['mistbell', 0.1],
    ['blight', 0.08],
    ['crownseed', 0.05],
  ],
  blight: [
    ['briar', 0.3],
    ['heart', 0.25],
    ['glimmer', 0.25],
    ['mistbell', 0.2],
  ],
  worldheart: [
    ['crownseed', 0.3],
    ['glimmer', 0.25],
    ['ember', 0.2],
    ['heart', 0.15],
    ['blight', 0.1],
  ],
};

function rollTable(table: LootTable): SeedId {
  let r = Math.random();
  for (const [id, w] of table) {
    r -= w;
    if (r <= 0) return id;
  }
  return table[table.length - 1][0];
}

export function essenceBase(room: Room): number {
  switch (room.seedId) {
    case 'copper':
      return 5 + 3 * room.maturity;
    case 'ember':
      return 8 + 4 * room.maturity;
    case 'glimmer':
      return 16 + 6 * room.maturity;
    case 'dew':
      return 3;
    case 'heart':
      return 4;
    case 'mistbell':
      return 2;
    case 'steamroot':
      return 5;
    case 'lumenheart':
      return 6;
    case 'ironbur':
      return 12 + 5 * room.maturity;
    case 'crownseed':
      return 30 + 8 * room.maturity;
    case 'blight':
      return 22 + 8 * room.maturity;
    case 'worldheart':
      return 60 + 12 * room.maturity;
    default:
      return 0;
  }
}

/** 房间清理掉落：精华 × 奖励倍率 × 全局修正；种子掉落数量随倍率与成熟度提升 */
export function rollLoot(room: Room, mods: RunMods = NO_RUN_MODS): LootResult {
  const essence = Math.round(essenceBase(room) * room.rewardMult * mods.essenceMult);
  const seeds: Partial<Record<SeedId, number>> = {};
  const table = TABLES[room.seedId];
  if (table) {
    let rolls =
      room.seedId === 'worldheart'
        ? 3
        : room.seedId === 'crownseed' || room.seedId === 'glimmer'
          ? 2
          : 1;
    const extraChance =
      (room.rewardMult - 1) * 0.5 + (room.maturity - 1) * 0.15 + mods.dropBonus;
    if (Math.random() < Math.min(0.9, extraChance)) rolls++;
    for (let i = 0; i < rolls; i++) {
      const id = rollTable(table);
      seeds[id] = (seeds[id] ?? 0) + 1;
    }
  }
  return { essence, seeds };
}

export function springHeal(room: Room): number {
  return 10 + 4 * room.maturity;
}

/** 嗜血藤事件给出的种子池 */
const BLOODVINE_POOL: SeedId[] = ['ember', 'briar', 'heart', 'glimmer', 'mistbell'];
export function rollBloodvineSeed(): SeedId {
  return BLOODVINE_POOL[Math.floor(Math.random() * BLOODVINE_POOL.length)];
}

/** 幽灵商人贩卖的高级种子池 */
const TRADER_POOL: SeedId[] = ['ember', 'briar', 'heart'];
export function rollTraderSeed(): SeedId {
  return TRADER_POOL[Math.floor(Math.random() * TRADER_POOL.length)];
}

export function briarDamage(room: Room): number {
  return 2 + room.maturity;
}

/** 灾厄窟的踏入伤害 */
export function curseDamage(room: Room): number {
  return 4 + 2 * room.maturity;
}

/** 完美收割的额外种子奖励 */
const PERFECT_POOL: SeedId[] = ['glimmer', 'heart', 'ember', 'briar'];
export function rollPerfectBonus(): SeedId {
  return PERFECT_POOL[Math.floor(Math.random() * PERFECT_POOL.length)];
}
