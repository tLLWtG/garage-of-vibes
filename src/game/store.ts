import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type {
  BuffId,
  BuildingId,
  CombatAction,
  FarmPlot,
  LogTone,
  Phase,
  ResultSummary,
  Room,
  RunState,
  SeedId,
  Tool,
  WeatherId,
} from './types';
import { CELLS, GRID } from './types';
import {
  ALL_SEED_IDS,
  BUFF_IDS,
  BUILDINGS,
  EMPOWERED_BUFF_IDS,
  SEEDS,
  WORLDHEART_REQS,
} from './seeds';
import { EVENT_IDS } from './events';
import { WEATHERS, rollWeather } from './weather';
import { setMuted, sfx } from './sound';
import { computeEffects, computeHybrids } from './growth';
import { generateDungeon, makeEnemy } from './dungeonGen';
import {
  GUARD_REDUCTION,
  HEAVY_CD_BASE,
  HEAVY_VULNERABILITY,
  PLAYER_BASE_ATK,
  PLAYER_BASE_HP,
  POTION_HEAL_RATIO,
  intentDamage,
  nextIntent,
  rollInitialIntent,
} from './combat';
import {
  briarDamage,
  curseDamage,
  rollBloodvineSeed,
  rollLoot,
  rollPerfectBonus,
  rollTraderSeed,
  springHeal,
} from './loot';
import { milestoneById } from './milestones';

// ---------- 初始状态 ----------

function initialFarm(): FarmPlot[] {
  return Array.from({ length: CELLS }, (_, i) => {
    const x = i % GRID;
    const y = Math.floor(i / GRID);
    const unlocked = x >= 1 && x <= 3 && y >= 1 && y <= 3;
    return { unlocked, seed: null, maturity: 0 };
  });
}

const initialSeeds = (): Record<SeedId, number> => ({
  gate: 0, // 门种不走库存：每季免费一颗
  copper: 3,
  dew: 1,
  briar: 0,
  heart: 1,
  ember: 0,
  glimmer: 0,
  mistbell: 0,
  crownseed: 0,
  steamroot: 0,
  ironbur: 0,
  lumenheart: 0,
  blight: 0,
  worldheart: 0,
});

// ---------- 价格 ----------

export function unlockPrice(unlockedCount: number): number {
  return 5 + 2 * (unlockedCount - 9);
}
export const WATER_PRICES = [12, 22, 35]; // 3->4, 4->5, 5->6
export const POTION_PRICES = [15, 30]; // 1->2, 2->3
export const WATER_BASE = 3;
export const WATER_CAP = 6;
export const POTION_CAP = 3;

// ---------- Store ----------

interface GameStore {
  phase: Phase;
  season: number;
  essence: number;
  water: number;
  waterMax: number;
  potionMax: number;
  seeds: Record<SeedId, number>;
  farm: FarmPlot[];
  buildings: BuildingId[];
  weather: WeatherId;
  muted: boolean;
  run: RunState | null;
  result: ResultSummary | null;
  milestones: string[];
  /** 新完成、待依次展示的里程碑队列 */
  milestoneToasts: string[];
  tool: Tool;
  logSeq: number;
  /** 自增触发地牢入场翻转动画 */
  flipToken: number;

  setTool(t: Tool): void;
  clickPlot(idx: number): void;
  buySeed(id: SeedId): void;
  buyBuilding(id: BuildingId): void;
  upgradeWater(): void;
  upgradePotion(): void;
  descend(): void;

  moveTo(key: string): void;
  act(action: CombatAction, targetKey?: string): void;
  choosePower(id: BuffId): void;
  resolveEvent(accept: boolean): void;
  ascend(): void;

  backToFarm(): void;
  dismissToast(): void;
  toggleMute(): void;
  resetAll(): void;
}

// ---------- 内部 helpers（在 immer draft 上操作） ----------

type Draft = GameStore;

function pushLog(s: Draft, text: string, tone: LogTone = 'info') {
  const r = s.run;
  if (!r) return;
  r.log.unshift({ id: ++s.logSeq, text, tone });
  if (r.log.length > 80) r.log.pop();
}

function award(s: Draft, id: string) {
  if (s.milestones.includes(id)) return;
  const def = milestoneById(id);
  if (!def) return;
  s.milestones.push(id);
  s.essence += def.reward;
  s.milestoneToasts.push(id);
  sfx('milestone');
}

function collectRoom(s: Draft, room: Room) {
  const r = s.run!;
  const loot = rollLoot(room, r.mods);
  if (loot.essence > 0 || Object.keys(loot.seeds).length > 0) sfx('loot');
  if (loot.essence > 0) {
    r.gainedEssence += loot.essence;
    pushLog(s, `拾取 ${loot.essence} 精华（×${room.rewardMult.toFixed(2)}）`, 'loot');
  }
  for (const [id, n] of Object.entries(loot.seeds) as [SeedId, number][]) {
    r.gainedSeeds[id] = (r.gainedSeeds[id] ?? 0) + n;
    pushLog(s, `获得种子「${SEEDS[id].name}」×${n}`, 'loot');
  }
}

function applyGains(s: Draft, essence: number, seeds: Partial<Record<SeedId, number>>) {
  s.essence += essence;
  for (const [id, n] of Object.entries(seeds) as [SeedId, number][]) {
    s.seeds[id] += n;
  }
}

function halveSeeds(seeds: Partial<Record<SeedId, number>>): Partial<Record<SeedId, number>> {
  const out: Partial<Record<SeedId, number>> = {};
  for (const [id, n] of Object.entries(seeds) as [SeedId, number][]) {
    const kept = Math.floor(n / 2);
    if (kept > 0) out[id] = kept;
  }
  return out;
}

function countRooms(r: RunState) {
  const rooms = Object.values(r.rooms).filter((rm) => rm.kind !== 'entrance');
  return {
    total: rooms.length,
    cleared: rooms.filter((rm) => rm.cleared).length,
  };
}

function finishRun(s: Draft, died: boolean) {
  const r = s.run!;
  const { total, cleared } = countRooms(r);
  const perfect = !died && total > 0 && cleared === total;
  const victory = !died && !!r.slainWorldheart;

  let essence = r.gainedEssence;
  let seeds = r.gainedSeeds;
  let bonusSeed: SeedId | null = null;

  if (died) {
    essence = Math.floor(essence / 2);
    seeds = halveSeeds(seeds);
  } else {
    if (perfect) {
      bonusSeed = rollPerfectBonus();
      seeds = { ...seeds, [bonusSeed]: (seeds[bonusSeed] ?? 0) + 1 };
      // 晒谷场：完美收割的精华额外 +15%
      if (s.buildings.includes('threshing')) {
        essence = Math.round(essence * 1.15);
      }
      award(s, 'perfect');
    }
    if (essence >= 40) award(s, 'rich');
    award(s, 'first_run');
  }

  applyGains(s, essence, seeds);
  s.result = {
    died,
    perfect,
    victory,
    essence,
    seeds,
    bonusSeed,
    clearedRooms: cleared,
    totalRooms: total,
    deepest: r.deepest,
    season: s.season,
  };
  s.run = null;
  s.phase = 'result';
  if (!died) sfx('win');
}

function die(s: Draft) {
  pushLog(s, '你倒在了地底……收获散落了一半。', 'bad');
  sfx('die');
  finishRun(s, true);
}

function startCombat(s: Draft, room: Room) {
  const r = s.run!;
  r.combatRoom = room.key;
  r.heavyCd = 0;
  room.enemies.forEach((e) => {
    if (e.hp <= 0) return;
    if (e.kind === 'rootlord' || e.kind === 'worldheart') {
      // Boss 走固定循环，从「攻击」开始
      e.intent = 'attack';
      e.patternIdx = 0;
    } else {
      e.intent = rollInitialIntent();
    }
  });
  sfx(room.kind === 'boss' ? 'boss' : 'combat');
  pushLog(
    s,
    room.kind === 'boss'
      ? room.seedId === 'worldheart'
        ? '大地之心在岩壁深处搏动、苏醒——终局之战开始！'
        : '根须霸主从王座上缓缓起身——Boss 战开始！'
      : room.guarded && room.kind === 'treasure'
        ? '宝藏被守卫看管着——战斗开始！'
        : '敌人扑了上来——战斗开始！',
    'bad',
  );
}

function rollPowers(empowered: boolean): BuffId[] {
  const pool = [...(empowered ? EMPOWERED_BUFF_IDS : BUFF_IDS)];
  const out: BuffId[] = [];
  for (let i = 0; i < 3 && pool.length; i++) {
    out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  return out;
}

/** 场上除 Boss 外的存活敌人数（召唤上限判定用） */
function minionCount(room: Room): number {
  return room.enemies.filter(
    (e) => e.hp > 0 && e.kind !== 'rootlord' && e.kind !== 'worldheart',
  ).length;
}

/** 大地之心半血狂暴检查 */
function checkEnrage(s: Draft, room: Room) {
  for (const e of room.enemies) {
    if (e.kind === 'worldheart' && !e.enraged && e.hp > 0 && e.hp <= e.maxHp / 2) {
      e.enraged = true;
      e.atk += 3;
      e.patternIdx = -1; // 下次推进意图时从狂怒循环头部开始
      sfx('enrage');
      pushLog(s, '大地之心震颤咆哮，根系疯狂增生——狂怒阶段！攻击 +3', 'bad');
    }
  }
}

/** 敌人回合：存活敌人按意图行动，返回玩家是否死亡 */
function enemyTurn(s: Draft, room: Room, vulnerability: number): boolean {
  const r = s.run!;
  // 迭代快照：召唤的新敌人本回合不行动
  for (const e of [...room.enemies]) {
    if (e.hp <= 0) continue;
    if (e.intent === 'summon') {
      if (minionCount(room) < 2) {
        const minion = makeEnemy('sprout', room.ignited, {
          atkAdd: r.mods.enemyAtkAdd,
          hpMult: r.mods.enemyHpMult,
        });
        room.enemies.push(minion);
        pushLog(s, `${e.name}的根须钻出地面，召唤了 ${minion.name}！`, 'bad');
      } else {
        pushLog(s, `${e.name}的根须在地下蠕动，却已无处可出。`, 'info');
      }
      continue;
    }
    const dmg = intentDamage(e);
    if (dmg > 0) {
      const taken = Math.max(1, Math.round(dmg * vulnerability));
      r.hp -= taken;
      sfx('hurt');
      pushLog(s, `${e.name}${e.intent === 'smash' ? '猛击' : '攻击'}了你，-${taken} HP`, 'bad');
      if (r.thorns > 0) {
        e.hp -= r.thorns;
        pushLog(s, `荆鳞反弹 ${r.thorns} 点伤害给 ${e.name}`, 'good');
      }
    } else {
      pushLog(s, `${e.name}正在蓄力——下回合是猛击！`, 'info');
    }
    if (r.hp <= 0) return true;
  }
  return false;
}

function checkCombatEnd(s: Draft, room: Room): boolean {
  const r = s.run!;
  if (room.enemies.every((e) => e.hp <= 0)) {
    room.cleared = true;
    r.combatRoom = null;
    if (room.kind === 'boss') {
      if (room.seedId === 'worldheart') {
        r.slainWorldheart = true;
        pushLog(s, '大地之心的搏动停止了。地底亮起了黎明般的光——你赢下了这座地牢。', 'good');
        award(s, 'worldheart_slain');
      } else {
        pushLog(s, '根须霸主轰然倒下，王座崩解成漫天精华！', 'good');
        award(s, 'boss_slain');
      }
    } else {
      pushLog(s, '房间清剿完毕。', 'good');
    }
    collectRoom(s, room);
    return true;
  }
  return false;
}

// ---------- Store 本体 ----------

export const useGame = create<GameStore>()(
  persist(
    immer((set, get) => ({
      phase: 'farm' as Phase,
      season: 1,
      essence: 12,
      water: WATER_BASE,
      waterMax: WATER_BASE,
      potionMax: 1,
      seeds: initialSeeds(),
      farm: initialFarm(),
      buildings: [],
      weather: 'sun' as WeatherId,
      muted: false,
      run: null,
      result: null,
      milestones: [],
      milestoneToasts: [],
      tool: null,
      logSeq: 0,
      flipToken: 0,

      setTool: (t) => set((s) => void (s.tool = t)),

      clickPlot: (idx) =>
        set((s) => {
          if (s.phase !== 'farm') return;
          const p = s.farm[idx];

          // 解锁
          if (!p.unlocked) {
            const unlockedCount = s.farm.filter((q) => q.unlocked).length;
            const price = unlockPrice(unlockedCount);
            if (s.essence >= price) {
              s.essence -= price;
              p.unlocked = true;
              sfx('unlock');
              if (s.farm.every((q) => q.unlocked)) award(s, 'all_plots');
            }
            return;
          }

          const t = s.tool;
          if (!t) return;

          if (t.type === 'seed') {
            if (p.seed) return;
            if (t.id === 'gate') {
              if (s.farm.some((q) => q.seed === 'gate')) return;
              p.seed = 'gate';
              p.maturity = 1;
              s.tool = null;
              sfx('plant');
              return;
            }
            if (s.seeds[t.id] <= 0) return;
            s.seeds[t.id]--;
            p.seed = t.id;
            p.maturity = 1;
            sfx('plant');
            // 库存用尽自动放下工具
            if (s.seeds[t.id] <= 0) s.tool = null;
          } else if (t.type === 'water') {
            if (!p.seed || p.maturity >= 3 || s.water <= 0) return;
            if (p.seed === 'gate') return; // 门不需要浇水
            s.water--;
            p.maturity++;
            sfx('water');
          } else if (t.type === 'shovel') {
            if (!p.seed) return;
            if (p.seed !== 'gate') s.seeds[p.seed]++;
            p.seed = null;
            p.maturity = 0;
            sfx('shovel');
          }
        }),

      buySeed: (id) =>
        set((s) => {
          const def = SEEDS[id];
          if (def.cost == null || s.essence < def.cost) return;
          // 大地之心需先达成解锁里程碑
          if (id === 'worldheart' && !WORLDHEART_REQS.every((m) => s.milestones.includes(m)))
            return;
          s.essence -= def.cost;
          s.seeds[id]++;
          sfx('buy');
        }),

      buyBuilding: (id) =>
        set((s) => {
          const def = BUILDINGS[id];
          if (s.buildings.includes(id) || s.essence < def.cost) return;
          s.essence -= def.cost;
          s.buildings.push(id);
          sfx('buy');
        }),

      upgradeWater: () =>
        set((s) => {
          const tier = s.waterMax - WATER_BASE;
          const price = WATER_PRICES[tier];
          if (price == null || s.essence < price || s.waterMax >= WATER_CAP) return;
          s.essence -= price;
          s.waterMax++;
          s.water++;
          sfx('buy');
        }),

      upgradePotion: () =>
        set((s) => {
          const tier = s.potionMax - 1;
          const price = POTION_PRICES[tier];
          if (price == null || s.essence < price || s.potionMax >= POTION_CAP) return;
          s.essence -= price;
          s.potionMax++;
          sfx('buy');
        }),

      descend: () =>
        set((s) => {
          if (s.phase !== 'farm') return;
          const fx = computeEffects(s.farm);

          // 全局修正烘焙：天气 + 灾厄威压
          const W = WEATHERS[s.weather];
          const cursed = s.farm.some((p) => p.seed === 'blight');
          const enemyMods = {
            atkAdd: W.enemyAtkAdd + (cursed ? 1 : 0),
            hpMult: W.enemyHpMult * (cursed ? 1.15 : 1),
          };
          const gen = generateDungeon(s.farm, fx, {
            rewardMultAdd: W.rewardMultAdd,
            enemyMods,
          });
          if (!gen) return;
          const planted = s.farm.filter((p) => p.seed && p.seed !== 'gate').length;
          if (planted === 0) return;

          if (gen.anyIgnited) award(s, 'first_ignite');

          // 杂交结算：满成熟相邻组合在翻转瞬间结出杂交种，直接入袋
          const hybrids = computeHybrids(s.farm, fx);
          const hybridLogs = hybrids.map((h) => {
            const an = SEEDS[s.farm[h.a].seed!].name;
            const bn = SEEDS[s.farm[h.b].seed!].name;
            return `杂交反应！${an} × ${bn} 结出「${SEEDS[h.result].name}」×1，已收入种子袋`;
          });
          for (const h of hybrids) s.seeds[h.result]++;

          s.run = {
            rooms: gen.rooms,
            pos: gen.entranceKey,
            entranceKey: gen.entranceKey,
            hp: PLAYER_BASE_HP,
            maxHp: PLAYER_BASE_HP,
            atk: PLAYER_BASE_ATK,
            potions: s.potionMax,
            buffs: [],
            thorns: 0,
            leech: 0,
            heavyCdMax: HEAVY_CD_BASE,
            heavyCd: 0,
            combatRoom: null,
            prevPos: null,
            powerChoice: null,
            eventId: null,
            mods: {
              essenceMult: W.essenceMult,
              dropBonus: W.dropBonus,
              healAdd: W.healAdd,
              enemyAtkAdd: enemyMods.atkAdd,
              enemyHpMult: enemyMods.hpMult,
            },
            gainedEssence: 0,
            gainedSeeds: {},
            deepest: 0,
            log: [],
          };
          // 种子已化作地牢，农田翻空
          s.farm.forEach((p) => {
            p.seed = null;
            p.maturity = 0;
          });
          s.tool = null;
          s.flipToken++;
          s.phase = 'dungeon';
          sfx('descend');
          pushLog(s, `第 ${s.season} 季的农田翻转成了地牢。深入，收割，活着回来。`, 'info');
          if (s.weather !== 'sun') {
            pushLog(s, `今季「${W.name}」：${W.desc}`, 'info');
          }
          if (cursed) {
            pushLog(s, '灾厄威压笼罩全场：所有敌人生命 +15%、攻击 +1。', 'bad');
          }
          if (gen.withered > 0) {
            pushLog(s, `${gen.withered} 株与门种不相连的植物枯萎了。`, 'bad');
          }
          hybridLogs.forEach((t) => pushLog(s, t, 'loot'));
          if (hybrids.length > 0) award(s, 'first_hybrid');
        }),

      moveTo: (key) =>
        set((s) => {
          const r = s.run;
          if (!r || r.combatRoom || r.powerChoice || r.eventId) return;
          const room = r.rooms[key];
          const cur = r.rooms[r.pos];
          if (!room || !cur) return;
          if (Math.abs(room.x - cur.x) + Math.abs(room.y - cur.y) !== 1) return;

          r.prevPos = r.pos;
          r.pos = key;
          sfx('move');
          if (room.depth > r.deepest) r.deepest = room.depth;
          if (room.depth >= 4) award(s, 'deep4');
          if (room.cleared) return;

          switch (room.kind) {
            case 'combat':
            case 'boss':
              startCombat(s, room);
              break;
            case 'treasure':
              if (room.guarded && room.enemies.some((e) => e.hp > 0)) {
                startCombat(s, room);
              } else {
                room.cleared = true;
                pushLog(s, '你打开了无人看守的宝藏。', 'good');
                collectRoom(s, room);
              }
              break;
            case 'spring': {
              if (room.seedId === 'steamroot') {
                // 蒸汽温泉：回满并淬炼
                r.hp = r.maxHp;
                r.atk += 1;
                room.cleared = true;
                sfx('potion');
                pushLog(s, '蒸汽包裹全身：生命完全回复，攻击 +1！', 'good');
                collectRoom(s, room);
                break;
              }
              const heal = Math.max(
                1,
                springHeal(room) +
                  r.mods.healAdd +
                  (s.buildings.includes('herbplot') ? 5 : 0),
              );
              const before = r.hp;
              r.hp = Math.min(r.maxHp, r.hp + heal);
              room.cleared = true;
              sfx('potion');
              pushLog(s, `泉水治愈了你，+${r.hp - before} HP`, 'good');
              collectRoom(s, room);
              break;
            }
            case 'briar': {
              const dmg = briarDamage(room);
              r.hp -= dmg;
              room.cleared = true;
              sfx('hurt');
              pushLog(s, `你挤过荆棘丛，被刺伤 -${dmg} HP`, 'bad');
              if (r.hp <= 0) {
                die(s);
              }
              break;
            }
            case 'curse': {
              const dmg = curseDamage(room);
              r.hp -= dmg;
              room.cleared = true;
              sfx('hurt');
              pushLog(s, `灾厄之气撕咬你的血肉 -${dmg} HP……但窟底全是精华。`, 'bad');
              if (r.hp <= 0) {
                die(s);
                break;
              }
              award(s, 'curse_clear');
              collectRoom(s, room);
              break;
            }
            case 'power':
              r.powerChoice = rollPowers(room.seedId === 'lumenheart');
              pushLog(
                s,
                room.seedId === 'lumenheart'
                  ? '辉光自圣龛中涌出……选择一种强化祝福。'
                  : '心藤的低语在耳边响起……选择一种祝福。',
                'info',
              );
              break;
            case 'event':
              r.eventId = EVENT_IDS[Math.floor(Math.random() * EVENT_IDS.length)];
              pushLog(s, '雾气在铃声中聚拢，浮现出一桩际遇……', 'info');
              break;
            case 'entrance':
              break;
          }
        }),

      act: (action, targetKey) =>
        set((s) => {
          const r = s.run;
          if (!r || !r.combatRoom) return;
          const room = r.rooms[r.combatRoom];
          const alive = room.enemies.filter((e) => e.hp > 0);
          if (!alive.length) return;

          const target =
            alive.find((e) => e.key === targetKey) ?? alive[0];

          let vulnerability = 1;

          const strike = (mult: number) => {
            const dmg = Math.round(r.atk * mult);
            target.hp -= dmg;
            sfx(mult > 1 ? 'heavy' : 'hit');
            pushLog(s, `你${mult > 1 ? '挥出重击' : '攻击'}了 ${target.name}，-${dmg} HP`, 'good');
            if (target.hp <= 0) pushLog(s, `${target.name} 被消灭了！`, 'good');
            if (r.leech > 0) r.hp = Math.min(r.maxHp, r.hp + r.leech);
          };

          switch (action) {
            case 'attack':
              strike(1);
              break;
            case 'heavy':
              if (r.heavyCd > 0) return;
              strike(2);
              r.heavyCd = r.heavyCdMax;
              vulnerability = HEAVY_VULNERABILITY;
              break;
            case 'guard':
              vulnerability = GUARD_REDUCTION;
              sfx('guard');
              pushLog(s, '你举起手臂格挡，伤害大幅降低。', 'info');
              break;
            case 'potion': {
              if (r.potions <= 0) return;
              r.potions--;
              const heal = Math.round(r.maxHp * POTION_HEAL_RATIO);
              const before = r.hp;
              r.hp = Math.min(r.maxHp, r.hp + heal);
              sfx('potion');
              pushLog(s, `你饮下药水，+${r.hp - before} HP`, 'good');
              break;
            }
            case 'flee': {
              // 撤退：吃所有存活敌人的拦截攻击，然后退回上一间房
              if (s.buildings.includes('watchtower')) {
                pushLog(s, '瞭望塔的哨声掩护了你，敌人没能拦住撤退。', 'good');
              } else {
                for (const e of room.enemies) {
                  if (e.hp <= 0) continue;
                  const dmg = Math.max(1, intentDamage(e) || e.atk);
                  r.hp -= dmg;
                  pushLog(s, `${e.name}趁你撤退打了你一下，-${dmg} HP`, 'bad');
                  if (r.hp <= 0) {
                    die(s);
                    return;
                  }
                }
              }
              r.combatRoom = null;
              if (r.prevPos && r.rooms[r.prevPos]) r.pos = r.prevPos;
              room.enemies.forEach((e) => {
                if (e.hp > 0) e.intent = 'attack';
              });
              sfx('move');
              pushLog(s, '你退出了房间，敌人仍守在原地。', 'info');
              return;
            }
          }

          // 攻击可能清场
          if (checkCombatEnd(s, room)) return;
          // 大地之心半血狂暴
          checkEnrage(s, room);

          // 敌人回合
          if (enemyTurn(s, room, vulnerability)) {
            die(s);
            return;
          }
          // 反伤可能清场
          if (checkCombatEnd(s, room)) return;

          // 推进意图与冷却
          const minions = minionCount(room);
          room.enemies.forEach((e) => {
            if (e.hp > 0) e.intent = nextIntent(e, minions);
          });
          if (action !== 'heavy' && r.heavyCd > 0) r.heavyCd--;
        }),

      choosePower: (id) =>
        set((s) => {
          const r = s.run;
          if (!r || !r.powerChoice || !r.powerChoice.includes(id)) return;
          const room = r.rooms[r.pos];
          switch (id) {
            case 'might':
              r.atk += 2;
              break;
            case 'bark':
              r.maxHp += 10;
              r.hp = Math.min(r.maxHp, r.hp + 10);
              break;
            case 'swift':
              r.heavyCdMax = Math.max(1, r.heavyCdMax - 1);
              break;
            case 'thorns':
              r.thorns += 2;
              break;
            case 'satchel':
              r.potions += 2;
              break;
            case 'leech':
              r.leech += 1;
              break;
            case 'might2':
              r.atk += 4;
              break;
            case 'bark2':
              r.maxHp += 20;
              r.hp = Math.min(r.maxHp, r.hp + 20);
              break;
            case 'swift2':
              r.heavyCdMax = Math.max(1, r.heavyCdMax - 2);
              break;
            case 'thorns2':
              r.thorns += 4;
              break;
            case 'satchel2':
              r.potions += 3;
              r.hp = Math.min(r.maxHp, r.hp + 10);
              break;
            case 'leech2':
              r.leech += 2;
              break;
          }
          r.buffs.push(id);
          r.powerChoice = null;
          room.cleared = true;
          sfx('bless');
          pushLog(s, '祝福涌入你的血脉。', 'good');
          collectRoom(s, room);
        }),

      resolveEvent: (accept) =>
        set((s) => {
          const r = s.run;
          if (!r || !r.eventId) return;
          const id = r.eventId;
          // 付费选项钱不够时不结算（UI 已禁用，这里兜底）
          if (accept && id === 'well' && s.essence < 10) return;
          if (accept && id === 'ghostTrader' && s.essence < 6) return;

          const room = r.rooms[r.pos];
          r.eventId = null;
          room.cleared = true;
          sfx('bell');
          award(s, 'event_first');

          switch (id) {
            case 'well':
              if (accept) {
                s.essence -= 10;
                if (Math.random() < 0.5) {
                  r.gainedEssence += 20;
                  pushLog(s, '井水翻涌，吐出 20 精华——翻倍奉还！', 'loot');
                } else {
                  pushLog(s, '井底一声闷响，精华被吞没了。', 'bad');
                }
              } else {
                pushLog(s, '你捂紧口袋，绕开了低语井。', 'info');
              }
              break;
            case 'bloodvine': {
              if (accept) {
                r.hp -= 6;
                const seed = rollBloodvineSeed();
                r.gainedSeeds[seed] = (r.gainedSeeds[seed] ?? 0) + 1;
                pushLog(
                  s,
                  `藤刺没入手臂 -6 HP，你取下了种子「${SEEDS[seed].name}」`,
                  'loot',
                );
                if (r.hp <= 0) {
                  die(s);
                  return;
                }
              } else {
                pushLog(s, '你退后一步，嗜血藤悻悻收回尖刺。', 'info');
              }
              break;
            }
            case 'stele':
              if (accept) {
                r.atk += 1;
                pushLog(s, '「锋」字亮起，攻击 +1。', 'good');
              } else {
                const before = r.hp;
                r.hp = Math.min(r.maxHp, r.hp + 8);
                pushLog(s, `「愈」字亮起，+${r.hp - before} HP`, 'good');
              }
              break;
            case 'ghostTrader':
              if (accept) {
                s.essence -= 6;
                const seed = rollTraderSeed();
                r.gainedSeeds[seed] = (r.gainedSeeds[seed] ?? 0) + 1;
                pushLog(
                  s,
                  `幽灵商人递来布袋——里面是「${SEEDS[seed].name}」种子`,
                  'loot',
                );
              } else {
                pushLog(s, '你摇了摇头，身影叹息着消散在雾里。', 'info');
              }
              break;
            case 'collapse':
              if (accept) {
                r.hp -= 2;
                const gain = 8 + Math.floor(Math.random() * 7);
                if (r.hp <= 0) {
                  pushLog(s, '岩堆塌下来砸中了你……', 'bad');
                  die(s);
                  return;
                }
                r.gainedEssence += gain;
                pushLog(s, `碎石砸落 -2 HP，震出了 ${gain} 精华！`, 'loot');
              } else {
                pushLog(s, '你绕开了摇摇欲坠的碎石。', 'info');
              }
              break;
          }
          collectRoom(s, room);
        }),

      ascend: () =>
        set((s) => {
          const r = s.run;
          if (!r || r.pos !== r.entranceKey || r.combatRoom) return;
          finishRun(s, false);
        }),

      backToFarm: () =>
        set((s) => {
          if (s.phase !== 'result') return;
          s.season++;
          s.result = null;
          s.tool = null;
          s.phase = 'farm';
          // 新一季的天气（开局水量吃天气修正，最低 1）
          s.weather = rollWeather();
          s.water = Math.max(1, s.waterMax + WEATHERS[s.weather].waterBonus);
          // 温室：每季开始赠 1 颗随机基础种子
          if (s.buildings.includes('greenhouse')) {
            const gift: SeedId = Math.random() < 0.5 ? 'copper' : 'dew';
            s.seeds[gift]++;
          }
          // 防软锁低保：没有任何种子且买不起最便宜的种子时，大地施舍两颗铜芽
          const totalSeeds = Object.values(s.seeds).reduce((a, b) => a + b, 0);
          if (totalSeeds === 0 && s.essence < (SEEDS.copper.cost ?? 4)) {
            s.seeds.copper += 2;
          }
        }),

      dismissToast: () => set((s) => void s.milestoneToasts.shift()),

      toggleMute: () =>
        set((s) => {
          s.muted = !s.muted;
          setMuted(s.muted);
        }),

      resetAll: () =>
        set((s) => {
          s.phase = 'farm';
          s.season = 1;
          s.essence = 12;
          s.water = WATER_BASE;
          s.waterMax = WATER_BASE;
          s.potionMax = 1;
          s.seeds = initialSeeds();
          s.farm = initialFarm();
          s.buildings = [];
          s.weather = 'sun';
          s.run = null;
          s.result = null;
          s.milestones = [];
          s.milestoneToasts = [];
          s.tool = null;
          s.logSeq = 0;
          s.flipToken = 0;
        }),
    })),
    {
      name: 'seed-the-dungeon-save-v1',
      version: 3,
      // 旧档迁移：补齐新增种子的 0 库存（避免 undefined++ 变 NaN）、建筑、天气与静音设置
      migrate: (persisted) => {
        const s = persisted as GameStore;
        if (s?.seeds) {
          for (const id of ALL_SEED_IDS) {
            if (typeof s.seeds[id] !== 'number') s.seeds[id] = 0;
          }
        }
        if (s && !Array.isArray(s.buildings)) s.buildings = [];
        if (s && !s.weather) s.weather = 'sun';
        if (s && typeof s.muted !== 'boolean') s.muted = false;
        // v2 存档若有进行中的 run，补 mods 默认值
        if (s?.run && !s.run.mods) {
          s.run.mods = {
            essenceMult: 1,
            dropBonus: 0,
            healAdd: 0,
            enemyAtkAdd: 0,
            enemyHpMult: 1,
          };
        }
        return s;
      },
      onRehydrateStorage: () => (state) => {
        if (state) setMuted(state.muted);
      },
      partialize: (s) =>
        Object.fromEntries(
          Object.entries(s).filter(
            ([k]) => !['tool', 'milestoneToasts'].includes(k),
          ),
        ) as GameStore,
    },
  ),
);
