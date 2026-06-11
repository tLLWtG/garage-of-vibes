import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useGame, unlockPrice, WATER_PRICES, POTION_PRICES, WATER_BASE, WATER_CAP, POTION_CAP } from '../game/store';
import { SEEDS, SEED_ORDER, RARITY_LABEL, BUILDINGS, BUILDING_ORDER, WORLDHEART_REQS } from '../game/seeds';
import { computeEffects, computeDepths, computeHybrids, rewardMultOf } from '../game/growth';
import { squadKinds, ENEMY_BASE } from '../game/dungeonGen';
import { MILESTONES } from '../game/milestones';
import { WEATHERS } from '../game/weather';
import type { SeedId } from '../game/types';
import { SeedIcon, MiscIcon, MaturityDots, WeatherIcon } from './icons';

type Tab = 'info' | 'shop' | 'quest';

export function FarmView() {
  const farm = useGame((s) => s.farm);
  const seeds = useGame((s) => s.seeds);
  const tool = useGame((s) => s.tool);
  const setTool = useGame((s) => s.setTool);
  const clickPlot = useGame((s) => s.clickPlot);
  const water = useGame((s) => s.water);
  const essence = useGame((s) => s.essence);
  const descend = useGame((s) => s.descend);

  const [tab, setTab] = useState<Tab>('info');
  const [inspect, setInspect] = useState<number | null>(null);

  const fx = useMemo(() => computeEffects(farm), [farm]);
  const depths = useMemo(() => computeDepths(farm), [farm]);
  /** 参与杂交的地块 → 杂交产物（实时预览） */
  const hybridAt = useMemo(() => {
    const map = new Map<number, SeedId>();
    for (const h of computeHybrids(farm, fx)) {
      map.set(h.a, h.result);
      map.set(h.b, h.result);
    }
    return map;
  }, [farm, fx]);

  const gatePlanted = farm.some((p) => p.seed === 'gate');
  const plantedCount = farm.filter((p) => p.seed && p.seed !== 'gate').length;
  const witheredCount = farm.filter((p, i) => p.seed && !fx[i].reachable).length;
  const unlockedCount = farm.filter((p) => p.unlocked).length;
  const cursed = farm.some((p) => p.seed === 'blight');

  const canDescend = gatePlanted && plantedCount > 0;
  const descendHint = !gatePlanted
    ? '需要先种下门种（地牢入口）'
    : plantedCount === 0
      ? '至少再种一株作物'
      : witheredCount > 0
        ? `警告：${witheredCount} 株植物与门种不相连，将会枯萎`
        : '农田将翻转成地牢';

  return (
    <motion.div
      className="view farm-view"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -14 }}
      transition={{ duration: 0.3 }}
    >
      {/* 左：种子袋与工具 */}
      <aside className="panel side-panel">
        <h3 className="panel-title">种子袋</h3>
        <div className="seed-list">
          {SEED_ORDER.map((id) => {
            const def = SEEDS[id];
            const isGate = id === 'gate';
            const count = isGate ? (gatePlanted ? 0 : 1) : seeds[id];
            const selected = tool?.type === 'seed' && tool.id === id;
            const disabled = count <= 0;
            return (
              <button
                key={id}
                className={`seed-item ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
                style={{ ['--seed-color' as string]: def.color }}
                onClick={() => {
                  if (disabled) { setTab('info'); setInspect(null); setTool(null); return; }
                  setTool(selected ? null : { type: 'seed', id });
                }}
                onMouseEnter={() => setInspect(null)}
                title={def.tagline}
              >
                <span className="seed-item-icon">
                  <SeedIcon id={id} size={24} />
                </span>
                <span className="seed-item-body">
                  <span className="seed-item-name">{def.name}</span>
                  <span className="seed-item-tag">{def.tagline}</span>
                </span>
                <span className="seed-item-count">{isGate ? (gatePlanted ? '已种' : '1/季') : `×${count}`}</span>
              </button>
            );
          })}
        </div>
        <h3 className="panel-title">工具</h3>
        <div className="tool-row">
          <button
            className={`tool-btn ${tool?.type === 'water' ? 'selected' : ''}`}
            onClick={() => setTool(tool?.type === 'water' ? null : { type: 'water' })}
            disabled={water <= 0}
          >
            <MiscIcon kind="wateringCan" size={20} color="#6fc3ff" />
            浇水 <em>{water}</em>
          </button>
          <button
            className={`tool-btn ${tool?.type === 'shovel' ? 'selected' : ''}`}
            onClick={() => setTool(tool?.type === 'shovel' ? null : { type: 'shovel' })}
          >
            <MiscIcon kind="shovel" size={20} color="#d8c08a" />
            铲除
          </button>
        </div>
        <p className="hint-text">
          浇水提高成熟度（最高 3）：奖励更厚，敌人也更凶。
        </p>
      </aside>

      {/* 中：农田 */}
      <section className="board-col">
        <div className="board farm-board">
          {farm.map((plot, i) => {
            const e = fx[i];
            const depth = depths.get(i);
            const def = plot.seed ? SEEDS[plot.seed] : null;
            const canAfford = essence >= unlockPrice(unlockedCount);
            return (
              <button
                key={i}
                className={[
                  'cell',
                  plot.unlocked ? 'unlocked' : 'locked',
                  plot.seed ? 'planted' : '',
                  inspect === i ? 'inspected' : '',
                ].join(' ')}
                style={def ? { ['--seed-color' as string]: def.color } : undefined}
                onClick={() => {
                  clickPlot(i);
                  setInspect(i);
                  setTab('info');
                }}
                onMouseEnter={() => setInspect(i)}
              >
                {!plot.unlocked && (
                  <span className={`lock-tag ${canAfford ? 'afford' : ''}`}>
                    <MiscIcon kind="lock" size={14} />
                    <em>{unlockPrice(unlockedCount)}</em>
                  </span>
                )}
                {plot.unlocked && !plot.seed && <span className="soil-dot" />}
                {plot.seed && def && (
                  <>
                    <SeedIcon id={plot.seed} size={30} />
                    {plot.seed !== 'gate' && (
                      <MaturityDots value={plot.maturity} bonus={e.watered} />
                    )}
                    <span className="cell-badges">
                      {e.ignited && (
                        <span className="badge fire" title="将被点燃：敌人更强，掉落 ×1.75">
                          <MiscIcon kind="flame" size={12} color="#ff8a5c" />
                        </span>
                      )}
                      {e.watered > 0 && plot.seed !== 'gate' && plot.seed !== 'dew' && (
                        <span className="badge water" title={`被露根灌溉：有效成熟度 +${e.watered}`}>
                          <MiscIcon kind="water" size={12} color="#6fc3ff" />
                        </span>
                      )}
                      {e.briarN > 0 && plot.seed !== 'briar' && (
                        <span className="badge spike" title={`荆棘增幅：奖励 +${Math.round(Math.min(1.2, e.briarN * 0.4) * 100)}%`}>
                          <MiscIcon kind="spike" size={12} color="#b18cff" />
                        </span>
                      )}
                      {e.guarded && (
                        <span className="badge shield" title="宝藏将被守卫看管：需战斗，奖励 ×1.6">
                          <MiscIcon kind="shield" size={12} color="#ffd95c" />
                        </span>
                      )}
                      {hybridAt.has(i) && (
                        <span
                          className="badge hybrid"
                          title={`杂交预备：下潜时与相邻满成熟植株结出「${SEEDS[hybridAt.get(i)!].name}」×1`}
                        >
                          <MiscIcon kind="hybrid" size={12} color="#8fd8c8" />
                        </span>
                      )}
                      {!e.reachable && gatePlanted && (
                        <span className="badge warn" title="与门种不相连，下潜时将枯萎！">
                          <MiscIcon kind="warning" size={12} color="#ffb347" />
                        </span>
                      )}
                    </span>
                    {depth != null && depth > 0 && (
                      <span className="depth-tag">{depth}</span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </div>

        <div className="descend-row">
          <span className="descend-hints">
            <span className={`descend-hint ${witheredCount > 0 ? 'warn' : ''}`}>{descendHint}</span>
            {cursed && (
              <span className="descend-hint curse">
                灾厄威压：夜枯在田——本次下潜全体敌人生命 +15%、攻击 +1
              </span>
            )}
          </span>
          <button className="descend-btn" disabled={!canDescend} onClick={descend}>
            <MiscIcon kind="depth" size={18} />
            入夜 · 下潜
          </button>
        </div>
      </section>

      {/* 右：详情 / 商店 / 里程碑 */}
      <aside className="panel side-panel">
        <div className="tabs">
          {(
            [
              ['info', '详情'],
              ['shop', '商店'],
              ['quest', '里程碑'],
            ] as [Tab, string][]
          ).map(([t, label]) => (
            <button
              key={t}
              className={`tab ${tab === t ? 'active' : ''}`}
              onClick={() => setTab(t)}
            >
              {label}
            </button>
          ))}
        </div>
        {tab === 'info' && (
          <InfoTab inspect={inspect} fxAll={fx} depths={depths} hybridAt={hybridAt} />
        )}
        {tab === 'shop' && <ShopTab />}
        {tab === 'quest' && <QuestTab />}
      </aside>
    </motion.div>
  );
}

/* ---------- 详情 tab ---------- */

function InfoTab({
  inspect,
  fxAll,
  depths,
  hybridAt,
}: {
  inspect: number | null;
  fxAll: ReturnType<typeof computeEffects>;
  depths: Map<number, number>;
  hybridAt: Map<number, SeedId>;
}) {
  const farm = useGame((s) => s.farm);
  const tool = useGame((s) => s.tool);
  const weather = useGame((s) => s.weather);
  const W = WEATHERS[weather];
  const cursed = farm.some((p) => p.seed === 'blight');
  const enemyAtkAdd = W.enemyAtkAdd + (cursed ? 1 : 0);
  const enemyHpMult = W.enemyHpMult * (cursed ? 1.15 : 1);

  // 优先展示手持种子说明
  if (tool?.type === 'seed') {
    const def = SEEDS[tool.id];
    return (
      <div className="info-card">
        <div className="info-head" style={{ ['--seed-color' as string]: def.color }}>
          <SeedIcon id={tool.id} size={30} />
          <div>
            <div className="info-name">{def.name}</div>
            <div className="info-sub">
              {RARITY_LABEL[def.rarity]} · 长成「{def.roomName}」
            </div>
          </div>
        </div>
        <p className="info-desc">{def.effectDesc}</p>
        <p className="hint-text">点击空地种下。</p>
      </div>
    );
  }

  if (inspect == null || !farm[inspect] || !farm[inspect].unlocked) {
    return (
      <div className="info-card">
        <div className="weather-card">
          <WeatherIcon id={weather} size={22} />
          <div>
            <div className="info-name small">今季天气 · {W.name}</div>
            <p className="info-desc small">{W.desc}</p>
          </div>
        </div>
        <p className="info-desc">
          把鼠标悬停在地块上查看预览。
        </p>
        <p className="hint-text">
          农田会按原样翻转成地牢：种了的格子变成房间，空格变成岩壁。离门种越远的房间奖励越高。
        </p>
      </div>
    );
  }

  const plot = farm[inspect];
  if (!plot.seed) {
    return (
      <div className="info-card">
        <div className="info-name">空地</div>
        <p className="info-desc">不种东西的话，这里在地牢中将是一面岩壁。</p>
        <p className="hint-text">用墙塑造道路，也是一种种植。</p>
      </div>
    );
  }

  const def = SEEDS[plot.seed];
  const e = fxAll[inspect];
  const depth = depths.get(inspect);
  const mult =
    depth != null
      ? rewardMultOf(depth, e.briarN, e.guarded, e.ignited, W.rewardMultAdd)
      : null;
  const squad =
    def.kind === 'combat' ||
    def.kind === 'boss' ||
    (def.kind === 'treasure' && e.guarded)
      ? squadKinds(plot.seed, Math.max(1, e.effMaturity))
      : [];

  return (
    <div className="info-card">
      <div className="info-head" style={{ ['--seed-color' as string]: def.color }}>
        <SeedIcon id={plot.seed} size={30} />
        <div>
          <div className="info-name">{def.roomName}</div>
          <div className="info-sub">
            {def.name}
            {plot.seed !== 'gate' &&
              ` · 成熟度 ${e.effMaturity}${e.watered > 0 ? `（${plot.maturity}+${e.watered} 灌溉）` : ''}`}
          </div>
        </div>
      </div>

      <ul className="stat-list">
        {depth != null ? (
          <li>
            <span>深度</span>
            <em>{depth}</em>
          </li>
        ) : (
          <li className="warn-row">
            <span>深度</span>
            <em>不可达 · 将枯萎</em>
          </li>
        )}
        {mult != null && plot.seed !== 'gate' && (
          <li>
            <span>奖励倍率</span>
            <em>×{mult.toFixed(2)}</em>
          </li>
        )}
        {e.ignited && (
          <li className="fire-row">
            <span>被火帽点燃</span>
            <em>敌人强化 · 掉落 ×1.75</em>
          </li>
        )}
        {e.guarded && (
          <li className="warn-row">
            <span>守卫闻光而来</span>
            <em>需战斗 · 奖励 ×1.6</em>
          </li>
        )}
        {squad.length > 0 && (
          <li>
            <span>敌人</span>
            <em>{squad.map((k) => ENEMY_BASE[k].name).join('、')}</em>
          </li>
        )}
        {squad.length > 0 && (enemyAtkAdd > 0 || enemyHpMult !== 1) && (
          <li className={cursed ? 'curse-row' : 'warn-row'}>
            <span>全局修正</span>
            <em>
              {enemyHpMult !== 1 && `生命 ×${enemyHpMult.toFixed(2)} `}
              {enemyAtkAdd > 0 && `攻击 +${enemyAtkAdd}`}
              {cursed && '（灾厄威压）'}
            </em>
          </li>
        )}
        {W.rewardMultAdd > 0 && plot.seed !== 'gate' && (
          <li className="good-row">
            <span>天气 · {W.name}</span>
            <em>倍率已含 +{W.rewardMultAdd.toFixed(2)}</em>
          </li>
        )}
        {W.essenceMult !== 1 && plot.seed !== 'gate' && (
          <li className="good-row">
            <span>天气 · {W.name}</span>
            <em>精华 ×{W.essenceMult.toFixed(1)}</em>
          </li>
        )}
        {plot.seed === 'blight' && depth != null && (
          <li className="curse-row">
            <span>踏入伤害</span>
            <em>-{4 + 2 * Math.max(1, e.effMaturity)} HP</em>
          </li>
        )}
        {hybridAt.has(inspect) && (
          <li className="hybrid-row">
            <span>杂交预备</span>
            <em>下潜时结出「{SEEDS[hybridAt.get(inspect)!].name}」</em>
          </li>
        )}
      </ul>
      <p className="info-desc small">{def.effectDesc}</p>
    </div>
  );
}

/* ---------- 商店 tab ---------- */

function ShopTab() {
  const essence = useGame((s) => s.essence);
  const seeds = useGame((s) => s.seeds);
  const buySeed = useGame((s) => s.buySeed);
  const buildings = useGame((s) => s.buildings);
  const buyBuilding = useGame((s) => s.buyBuilding);
  const milestones = useGame((s) => s.milestones);
  const waterMax = useGame((s) => s.waterMax);
  const potionMax = useGame((s) => s.potionMax);
  const upgradeWater = useGame((s) => s.upgradeWater);
  const upgradePotion = useGame((s) => s.upgradePotion);

  const waterPrice = WATER_PRICES[waterMax - WATER_BASE];
  const potionPrice = POTION_PRICES[potionMax - 1];
  const worldheartUnlocked = WORLDHEART_REQS.every((m) => milestones.includes(m));

  return (
    <div className="shop">
      <h4 className="shop-title">种子</h4>
      {SEED_ORDER.filter((id) => SEEDS[id].cost != null).map((id) => {
        const def = SEEDS[id];
        if (id === 'worldheart' && !worldheartUnlocked) {
          return (
            <div className="shop-row locked-row" key={id} title="达成里程碑后解锁">
              <SeedIcon id={id} size={20} className="locked-icon" />
              <span className="shop-name">
                {def.name}
                <em className="shop-owned">达成「屠王者」+「初次杂交」后解锁</em>
              </span>
              <span className="maxed">
                <MiscIcon kind="lock" size={13} /> 未解锁
              </span>
            </div>
          );
        }
        return (
          <div className="shop-row" key={id} style={{ ['--seed-color' as string]: def.color }}>
            <SeedIcon id={id} size={20} />
            <span className="shop-name">
              {def.name}
              <em className="shop-owned">×{seeds[id]}</em>
            </span>
            <button
              className="buy-btn"
              disabled={essence < (def.cost ?? Infinity)}
              onClick={() => buySeed(id)}
            >
              <MiscIcon kind="essence" size={13} color="#6fc3ff" /> {def.cost}
            </button>
          </div>
        );
      })}
      <h4 className="shop-title">农场升级</h4>
      <div className="shop-row">
        <MiscIcon kind="wateringCan" size={20} color="#6fc3ff" />
        <span className="shop-name">
          扩容水壶
          <em className="shop-owned">{waterMax}/{WATER_CAP} 水</em>
        </span>
        {waterPrice != null ? (
          <button className="buy-btn" disabled={essence < waterPrice} onClick={upgradeWater}>
            <MiscIcon kind="essence" size={13} color="#6fc3ff" /> {waterPrice}
          </button>
        ) : (
          <span className="maxed">已满</span>
        )}
      </div>
      <div className="shop-row">
        <MiscIcon kind="potion" size={20} color="#7ee08a" />
        <span className="shop-name">
          药匠合作
          <em className="shop-owned">每次下潜 {potionMax} 瓶</em>
        </span>
        {potionPrice != null ? (
          <button className="buy-btn" disabled={essence < potionPrice} onClick={upgradePotion}>
            <MiscIcon kind="essence" size={13} color="#6fc3ff" /> {potionPrice}
          </button>
        ) : (
          <span className="maxed">已满</span>
        )}
      </div>
      <h4 className="shop-title">永久建筑</h4>
      {BUILDING_ORDER.map((id) => {
        const def = BUILDINGS[id];
        const owned = buildings.includes(id);
        return (
          <div className={`shop-row building-row ${owned ? 'owned' : ''}`} key={id}>
            <MiscIcon kind="building" size={20} color={owned ? '#7ee08a' : '#d8c08a'} />
            <span className="shop-name">
              {def.name}
              <em className="shop-owned">{def.desc}</em>
            </span>
            {owned ? (
              <span className="maxed">已建</span>
            ) : (
              <button
                className="buy-btn"
                disabled={essence < def.cost}
                onClick={() => buyBuilding(id)}
              >
                <MiscIcon kind="essence" size={13} color="#6fc3ff" /> {def.cost}
              </button>
            )}
          </div>
        );
      })}
      <p className="hint-text">
        解锁新田地：直接点击田里带锁的格子购买。建筑一次购买，永久生效。
      </p>
    </div>
  );
}

/* ---------- 里程碑 tab ---------- */

function QuestTab() {
  const done = useGame((s) => s.milestones);
  const resetAll = useGame((s) => s.resetAll);
  return (
    <div className="quests">
      {MILESTONES.map((m) => {
        const ok = done.includes(m.id);
        return (
          <div key={m.id} className={`quest-row ${ok ? 'done' : ''}`}>
            <span className="quest-check">
              {ok ? <MiscIcon kind="check" size={15} color="#7ee08a" /> : <span className="quest-dot" />}
            </span>
            <span className="quest-body">
              <span className="quest-name">{m.name}</span>
              <span className="quest-desc">{m.desc}</span>
            </span>
            <span className="quest-reward">
              <MiscIcon kind="essence" size={12} color="#6fc3ff" />
              {m.reward}
            </span>
          </div>
        );
      })}
      <button
        className="reset-btn"
        onClick={() => {
          if (confirm('确定要清空存档、从第 1 季重新开始吗？')) resetAll();
        }}
      >
        重开新档
      </button>
    </div>
  );
}
