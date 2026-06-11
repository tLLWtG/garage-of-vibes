import type { WeatherDef, WeatherId } from './types';

const W = (
  id: WeatherId,
  name: string,
  desc: string,
  mods: Partial<Omit<WeatherDef, 'id' | 'name' | 'desc'>> = {},
): WeatherDef => ({
  id,
  name,
  desc,
  waterBonus: 0,
  essenceMult: 1,
  rewardMultAdd: 0,
  enemyAtkAdd: 0,
  enemyHpMult: 1,
  healAdd: 0,
  dropBonus: 0,
  ...mods,
});

export const WEATHERS: Record<WeatherId, WeatherDef> = {
  sun: W('sun', '晴朗', '万里无云，一切如常。'),
  rain: W('rain', '甘霖', '夜雨润田：本季开局水 +2（可超出水壶上限）。', {
    waterBonus: 2,
  }),
  drought: W(
    'drought',
    '旱光',
    '烈日灼田：本季开局水 -1，但干涸的地脉裸露出更多精华——所有房间精华 ×1.2。',
    { waterBonus: -1, essenceMult: 1.2 },
  ),
  fog: W(
    'fog',
    '雾月',
    '浓雾笼罩地底：所有房间奖励倍率 +0.15，但看不清来路的敌人攻击 +1。',
    { rewardMultAdd: 0.15, enemyAtkAdd: 1 },
  ),
  frost: W(
    'frost',
    '寒潮',
    '地底寒气凝结：敌人生命 ×0.85，但冻结的泉眼治疗 -4。',
    { enemyHpMult: 0.85, healAdd: -4 },
  ),
  harvest: W(
    'harvest',
    '丰收月',
    '金色月光照拂：所有房间的种子额外掉落概率 +25%。',
    { dropBonus: 0.25 },
  ),
};

export const WEATHER_IDS: WeatherId[] = Object.keys(WEATHERS) as WeatherId[];

/** 随机一个新天气（第 1 季外部固定晴朗） */
export function rollWeather(): WeatherId {
  return WEATHER_IDS[Math.floor(Math.random() * WEATHER_IDS.length)];
}
