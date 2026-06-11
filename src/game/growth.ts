import type { FarmPlot, HybridPair, PlotEffect } from './types';
import { GRID } from './types';
import { hybridResult } from './seeds';

export function neighborsOf(idx: number): number[] {
  const x = idx % GRID;
  const y = Math.floor(idx / GRID);
  const out: number[] = [];
  if (x > 0) out.push(idx - 1);
  if (x < GRID - 1) out.push(idx + 1);
  if (y > 0) out.push(idx - GRID);
  if (y < GRID - 1) out.push(idx + GRID);
  return out;
}

/**
 * 计算整片农田的邻接效应。种植界面用它做实时预览，
 * 下潜时用同一份结果结算，保证「所见即所得」。
 */
export function computeEffects(farm: FarmPlot[]): PlotEffect[] {
  const fx: PlotEffect[] = farm.map(() => ({
    watered: 0,
    ignited: false,
    briarN: 0,
    guarded: false,
    effMaturity: 0,
    reachable: false,
  }));

  farm.forEach((p, i) => {
    if (!p.seed) return;
    const e = fx[i];
    for (const n of neighborsOf(i)) {
      const np = farm[n];
      if (!np.seed) continue;
      if (np.seed === 'dew') e.watered++;
      if (np.seed === 'briar') e.briarN++;
      if (p.seed === 'copper' && np.seed === 'ember') e.ignited = true;
      if (p.seed === 'glimmer' && (np.seed === 'copper' || np.seed === 'ember'))
        e.guarded = true;
    }
    e.effMaturity = Math.min(3, p.maturity + e.watered);
  });

  // 从门种 BFS，标记可达性（不可达的植物会枯萎，浪费掉）
  const gateIdx = farm.findIndex((p) => p.seed === 'gate');
  if (gateIdx >= 0) {
    const seen = new Set<number>([gateIdx]);
    const queue = [gateIdx];
    while (queue.length) {
      const cur = queue.shift()!;
      for (const n of neighborsOf(cur)) {
        if (!seen.has(n) && farm[n].seed) {
          seen.add(n);
          queue.push(n);
        }
      }
    }
    seen.forEach((i) => (fx[i].reachable = true));
  }
  return fx;
}

/**
 * 杂交结算：相邻且双方有效成熟度均为 3 的杂交组合各产出 1 颗杂交种子。
 * 每株每季最多参与一次（按从左到右、从上到下扫描贪心配对）。
 * 种植预览与下潜结算共用，保证「所见即所得」。
 */
export function computeHybrids(farm: FarmPlot[], fx: PlotEffect[]): HybridPair[] {
  const used = new Set<number>();
  const pairs: HybridPair[] = [];
  farm.forEach((p, i) => {
    if (!p.seed || used.has(i)) return;
    if (fx[i].effMaturity < 3 || !fx[i].reachable) return;
    // 只向右、向下检查，避免重复配对
    for (const n of [i + 1, i + GRID]) {
      if (n >= farm.length || (n === i + 1 && n % GRID === 0)) continue;
      if (used.has(n)) continue;
      const np = farm[n];
      if (!np.seed || fx[n].effMaturity < 3 || !fx[n].reachable) continue;
      const result = hybridResult(p.seed, np.seed);
      if (result) {
        used.add(i);
        used.add(n);
        pairs.push({ a: i, b: n, result });
        break;
      }
    }
  });
  return pairs;
}

/** 奖励倍率（与 dungeonGen 同一公式，种植预览用）。add 为天气等全局加成。 */
export function rewardMultOf(
  depth: number,
  briarN: number,
  guarded: boolean,
  ignited: boolean,
  add = 0,
): number {
  const mult =
    (1 + 0.25 * depth) *
      (1 + Math.min(1.2, 0.4 * briarN)) *
      (guarded ? 1.6 : 1) *
      (ignited ? 1.75 : 1) +
    add;
  return Math.round(mult * 100) / 100;
}

/** 从门种出发的 BFS 深度表，key 为地块下标。种植预览与生成共用。 */
export function computeDepths(farm: FarmPlot[]): Map<number, number> {
  const depths = new Map<number, number>();
  const gateIdx = farm.findIndex((p) => p.seed === 'gate');
  if (gateIdx < 0) return depths;
  depths.set(gateIdx, 0);
  const queue = [gateIdx];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const n of neighborsOf(cur)) {
      if (farm[n].seed && !depths.has(n)) {
        depths.set(n, depths.get(cur)! + 1);
        queue.push(n);
      }
    }
  }
  return depths;
}
