import type {
  Enemy,
  EnemyKind,
  FarmPlot,
  PlotEffect,
  Room,
  SeedId,
} from './types';
import { GRID, keyOf } from './types';
import { SEEDS } from './seeds';
import { computeDepths, rewardMultOf } from './growth';

export const ENEMY_BASE: Record<EnemyKind, { name: string; hp: number; atk: number }> = {
  sprout: { name: '芽虫', hp: 8, atk: 3 },
  beetle: { name: '甲壳郎', hp: 14, atk: 4 },
  emberling: { name: '燃魂', hp: 12, atk: 5 },
  guardian: { name: '地窖守卫', hp: 18, atk: 5 },
  ironshell: { name: '铁壳卫', hp: 22, atk: 5 },
  rootlord: { name: '根须霸主', hp: 42, atk: 6 },
  worldheart: { name: '大地之心', hp: 88, atk: 7 },
};

/** 敌人全局修正（天气 + 灾厄威压） */
export interface EnemyMods {
  atkAdd: number;
  hpMult: number;
}

export const NO_MODS: EnemyMods = { atkAdd: 0, hpMult: 1 };

let enemySeq = 0;

export function makeEnemy(
  kind: EnemyKind,
  ignited: boolean,
  mods: EnemyMods = NO_MODS,
): Enemy {
  const base = ENEMY_BASE[kind];
  const hp = Math.round(base.hp * (ignited ? 1.4 : 1) * mods.hpMult);
  const isBoss = kind === 'rootlord' || kind === 'worldheart';
  return {
    key: `e${++enemySeq}`,
    kind,
    name: ignited ? `燃·${base.name}` : base.name,
    hp,
    maxHp: hp,
    atk: (ignited ? Math.round(base.atk * 1.3) : base.atk) + mods.atkAdd,
    intent: 'attack',
    ignited,
    ...(isBoss ? { patternIdx: 0 } : {}),
  };
}

/** 房间的敌人编成（确定性，可用于种植阶段预览） */
export function squadKinds(seedId: SeedId, maturity: number): EnemyKind[] {
  if (seedId === 'copper') {
    return maturity <= 1 ? ['sprout'] : maturity === 2 ? ['sprout', 'sprout'] : ['beetle', 'sprout'];
  }
  if (seedId === 'ember') {
    return maturity <= 1
      ? ['emberling']
      : maturity === 2
        ? ['emberling', 'sprout']
        : ['emberling', 'emberling'];
  }
  if (seedId === 'glimmer') {
    return maturity <= 1 ? ['guardian'] : maturity === 2 ? ['guardian', 'sprout'] : ['guardian', 'beetle'];
  }
  if (seedId === 'ironbur') {
    return maturity <= 1
      ? ['ironshell']
      : maturity === 2
        ? ['ironshell', 'sprout']
        : ['ironshell', 'beetle'];
  }
  if (seedId === 'crownseed') {
    return ['rootlord'];
  }
  if (seedId === 'worldheart') {
    return ['worldheart'];
  }
  return [];
}

export interface DungeonGenResult {
  rooms: Record<string, Room>;
  entranceKey: string;
  /** 不可达而枯萎的植物数量 */
  withered: number;
  anyIgnited: boolean;
}

export interface GenMods {
  rewardMultAdd: number;
  enemyMods: EnemyMods;
}

export const NO_GEN_MODS: GenMods = { rewardMultAdd: 0, enemyMods: NO_MODS };

/**
 * 把农田原位翻转成地牢：一格一房间，空地即墙。
 * 不可达的植物枯萎（不生成房间）。
 */
export function generateDungeon(
  farm: FarmPlot[],
  fx: PlotEffect[],
  mods: GenMods = NO_GEN_MODS,
): DungeonGenResult | null {
  const gateIdx = farm.findIndex((p) => p.seed === 'gate');
  if (gateIdx < 0) return null;

  const depths = computeDepths(farm);
  const rooms: Record<string, Room> = {};
  let withered = 0;
  let anyIgnited = false;

  farm.forEach((p, i) => {
    if (!p.seed) return;
    if (!depths.has(i)) {
      withered++;
      return;
    }
    const e = fx[i];
    const def = SEEDS[p.seed];
    const depth = depths.get(i)!;
    const maturity = Math.max(1, e.effMaturity);
    const x = i % GRID;
    const y = Math.floor(i / GRID);
    const key = keyOf(x, y);
    const needsCombat =
      def.kind === 'combat' ||
      def.kind === 'boss' ||
      (def.kind === 'treasure' && e.guarded);
    if (e.ignited) anyIgnited = true;

    rooms[key] = {
      x,
      y,
      key,
      kind: def.kind,
      seedId: p.seed,
      maturity,
      ignited: e.ignited,
      guarded: e.guarded,
      briarN: e.briarN,
      depth,
      rewardMult: rewardMultOf(depth, e.briarN, e.guarded, e.ignited, mods.rewardMultAdd),
      cleared: def.kind === 'entrance',
      enemies: needsCombat
        ? squadKinds(p.seed, maturity).map((k) => makeEnemy(k, e.ignited, mods.enemyMods))
        : [],
    };
  });

  const gx = gateIdx % GRID;
  const gy = Math.floor(gateIdx / GRID);
  return { rooms, entranceKey: keyOf(gx, gy), withered, anyIgnited };
}
