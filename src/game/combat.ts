import type { Enemy, Intent } from './types';

/** 根须霸主的固定意图循环 */
export const BOSS_PATTERN: Intent[] = ['attack', 'summon', 'charge', 'smash'];
/** 大地之心阶段一循环 */
export const WORLDHEART_PATTERN: Intent[] = ['attack', 'charge', 'smash', 'summon'];
/** 大地之心狂怒循环（半血后） */
export const WORLDHEART_ENRAGED_PATTERN: Intent[] = ['attack', 'summon', 'smash'];

function bossPatternOf(e: Enemy): Intent[] {
  if (e.kind === 'worldheart') {
    return e.enraged ? WORLDHEART_ENRAGED_PATTERN : WORLDHEART_PATTERN;
  }
  return BOSS_PATTERN;
}

/**
 * 敌人下一回合意图。普通敌人：蓄力后必定猛击，否则小概率蓄力。
 * Boss 走固定循环；若轮到召唤但护驾小怪已 ≥2，则跳过召唤。
 * @param minionCount 当前场上除 Boss 外的存活敌人数
 */
export function nextIntent(e: Enemy, minionCount = 0): Intent {
  if (e.kind === 'rootlord' || e.kind === 'worldheart') {
    const pattern = bossPatternOf(e);
    let idx = ((e.patternIdx ?? 0) + 1) % pattern.length;
    if (pattern[idx] === 'summon' && minionCount >= 2) {
      idx = (idx + 1) % pattern.length;
    }
    e.patternIdx = idx;
    return pattern[idx];
  }
  if (e.intent === 'charge') return 'smash';
  return Math.random() < 0.22 ? 'charge' : 'attack';
}

export function rollInitialIntent(): Intent {
  return Math.random() < 0.18 ? 'charge' : 'attack';
}

/** 该意图本回合造成的伤害（蓄力/召唤回合为 0） */
export function intentDamage(e: Enemy): number {
  switch (e.intent) {
    case 'smash':
      return e.atk * 2;
    case 'attack':
      return e.atk;
    case 'charge':
    case 'summon':
      return 0;
  }
}

export const INTENT_LABEL: Record<Intent, string> = {
  attack: '攻击',
  charge: '蓄力',
  smash: '猛击',
  summon: '召唤',
};

export const HEAVY_CD_BASE = 3;
export const PLAYER_BASE_HP = 30;
export const PLAYER_BASE_ATK = 5;
export const GUARD_REDUCTION = 0.3;
export const HEAVY_VULNERABILITY = 1.5;
export const POTION_HEAL_RATIO = 0.4;
