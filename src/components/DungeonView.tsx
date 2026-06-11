import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGame } from '../game/store';
import { SEEDS, BUFFS } from '../game/seeds';
import { EVENTS } from '../game/events';
import { GRID, keyOf } from '../game/types';
import type { Room } from '../game/types';
import { SeedIcon, MiscIcon, EnemyIcon } from './icons';
import { CombatPanel } from './CombatPanel';

const ROOM_LABEL: Record<string, string> = {
  entrance: '入口',
  combat: '战斗',
  spring: '泉水',
  treasure: '宝藏',
  power: '祝福',
  briar: '荆棘',
  event: '际遇',
  boss: 'BOSS',
  curse: '灾厄',
};

export function DungeonView() {
  const run = useGame((s) => s.run);
  const flipToken = useGame((s) => s.flipToken);
  if (!run) return null;
  return <DungeonInner key={flipToken} />;
}

function DungeonInner() {
  const run = useGame((s) => s.run)!;
  const moveTo = useGame((s) => s.moveTo);
  const ascend = useGame((s) => s.ascend);
  const choosePower = useGame((s) => s.choosePower);

  const cur = run.rooms[run.pos];
  const atEntrance = run.pos === run.entranceKey;
  const busy = !!run.combatRoom || !!run.powerChoice || !!run.eventId;

  const isAdjacent = (room: Room) =>
    Math.abs(room.x - cur.x) + Math.abs(room.y - cur.y) === 1;

  const { total, cleared } = useMemo(() => {
    const rooms = Object.values(run.rooms).filter((r) => r.kind !== 'entrance');
    return { total: rooms.length, cleared: rooms.filter((r) => r.cleared).length };
  }, [run.rooms]);

  return (
    <motion.div
      className="view dungeon-view"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -14 }}
      transition={{ duration: 0.3 }}
    >
      {/* 左：玩家面板 */}
      <aside className="panel side-panel">
        <h3 className="panel-title">探险者</h3>
        <div className="hp-block">
          <div className="hp-row">
            <MiscIcon kind="hp" size={16} color="#ff6b81" />
            <span>
              {run.hp} / {run.maxHp}
            </span>
          </div>
          <div className="hp-bar">
            <motion.div
              className="hp-fill"
              animate={{ width: `${Math.max(0, (run.hp / run.maxHp) * 100)}%` }}
              transition={{ type: 'spring', stiffness: 200, damping: 26 }}
            />
          </div>
        </div>
        <ul className="stat-list">
          <li>
            <span>
              <MiscIcon kind="atk" size={14} color="#e8b04b" /> 攻击
            </span>
            <em>{run.atk}</em>
          </li>
          <li>
            <span>
              <MiscIcon kind="potion" size={14} color="#7ee08a" /> 药水
            </span>
            <em>×{run.potions}</em>
          </li>
          <li>
            <span>
              <MiscIcon kind="depth" size={14} color="#6fc3ff" /> 清理进度
            </span>
            <em>
              {cleared}/{total}
            </em>
          </li>
        </ul>
        {run.buffs.length > 0 && (
          <>
            <h3 className="panel-title">祝福</h3>
            <div className="buff-list">
              {run.buffs.map((b, i) => (
                <span className="buff-chip" key={i} title={BUFFS[b].desc}>
                  {BUFFS[b].name}
                </span>
              ))}
            </div>
          </>
        )}
        <p className="hint-text">
          {atEntrance
            ? '你站在入口。可以带着收获升上地表。'
            : '回到入口才能撤离。死亡会丢失一半收获。'}
        </p>
      </aside>

      {/* 中：地牢 */}
      <section className="board-col">
        <motion.div
          className="board dungeon-board"
          initial="hidden"
          animate="shown"
          variants={{ hidden: {}, shown: { transition: { staggerChildren: 0.04, delayChildren: 0.25 } } }}
          style={{ perspective: 900 }}
        >
          {Array.from({ length: GRID * GRID }, (_, i) => {
            const x = i % GRID;
            const y = Math.floor(i / GRID);
            const room = run.rooms[keyOf(x, y)];
            if (!room) {
              return (
                <motion.div
                  key={i}
                  className="cell rock"
                  variants={{
                    hidden: { rotateX: 90, opacity: 0 },
                    shown: { rotateX: 0, opacity: 1 },
                  }}
                />
              );
            }
            const here = run.pos === room.key;
            const reachable = !busy && !here && isAdjacent(room);
            const def = SEEDS[room.seedId];
            const aliveEnemies = room.enemies.filter((e) => e.hp > 0);
            return (
              <motion.button
                key={i}
                className={[
                  'cell room',
                  room.cleared ? 'cleared' : '',
                  here ? 'here' : '',
                  reachable ? 'reachable' : '',
                  room.ignited ? 'ignited' : '',
                ].join(' ')}
                style={{ ['--seed-color' as string]: def.color }}
                variants={{
                  hidden: { rotateX: 90, opacity: 0 },
                  shown: { rotateX: 0, opacity: 1 },
                }}
                disabled={!reachable}
                onClick={() => moveTo(room.key)}
                title={`${def.roomName} · 深度${room.depth} · 奖励×${room.rewardMult.toFixed(2)}`}
              >
                <SeedIcon id={room.seedId} size={26} />
                <span className="room-label">{ROOM_LABEL[room.kind]}</span>
                {!room.cleared && aliveEnemies.length > 0 && (
                  <span className="room-enemies">
                    {aliveEnemies.map((e) => (
                      <EnemyIcon key={e.key} kind={e.kind} size={13} color={e.ignited ? '#ff8a5c' : '#cfd8e6'} />
                    ))}
                  </span>
                )}
                {room.cleared && room.kind !== 'entrance' && (
                  <span className="room-check">
                    <MiscIcon kind="check" size={13} color="#7ee08a" />
                  </span>
                )}
                {!room.cleared && room.kind !== 'entrance' && (
                  <span className="mult-tag">×{room.rewardMult.toFixed(2)}</span>
                )}
                {here && (
                  <motion.span
                    className="player-marker"
                    layoutId="player-marker"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  >
                    <MiscIcon kind="player" size={15} color="#fff" />
                  </motion.span>
                )}
              </motion.button>
            );
          })}
        </motion.div>

        <div className="descend-row">
          <span className="descend-hint">
            {busy ? '……' : atEntrance ? '收获已稳妥，可随时撤离' : `当前：${SEEDS[cur.seedId].roomName}`}
          </span>
          <button className="descend-btn ascend" disabled={!atEntrance || busy} onClick={ascend}>
            <MiscIcon kind="flee" size={17} />
            升上地表
          </button>
        </div>
      </section>

      {/* 右：日志 */}
      <aside className="panel side-panel">
        <h3 className="panel-title">见闻</h3>
        <div className="log-list">
          <AnimatePresence initial={false}>
            {run.log.slice(0, 28).map((l) => (
              <motion.div
                key={l.id}
                className={`log-row ${l.tone}`}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.18 }}
              >
                {l.text}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </aside>

      {/* 弹层 */}
      <AnimatePresence>
        {run.combatRoom && <CombatPanel key="combat" />}
        {run.powerChoice && (
          <motion.div
            key="power"
            className="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="modal power-modal"
              initial={{ scale: 0.86, y: 18 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            >
              <h3 className="modal-title">
                {cur.seedId === 'lumenheart'
                  ? '辉光圣龛 · 强化祝福三选一'
                  : '心藤的祝福 · 三选一'}
              </h3>
              <div className="power-options">
                {run.powerChoice.map((b) => (
                  <button key={b} className="power-card" onClick={() => choosePower(b)}>
                    <span className="power-name">{BUFFS[b].name}</span>
                    <span className="power-desc">{BUFFS[b].desc}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
        {run.eventId && <EventModal key="event" eventId={run.eventId} />}
      </AnimatePresence>
    </motion.div>
  );
}

/* ---------- 事件弹层 ---------- */

function EventModal({ eventId }: { eventId: keyof typeof EVENTS }) {
  const resolveEvent = useGame((s) => s.resolveEvent);
  const essence = useGame((s) => s.essence);
  const ev = EVENTS[eventId];
  const cost = eventId === 'well' ? 10 : eventId === 'ghostTrader' ? 6 : 0;
  const cantAfford = cost > 0 && essence < cost;
  return (
    <motion.div
      className="overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="modal event-modal"
        initial={{ scale: 0.86, y: 18 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      >
        <span className="event-fog" aria-hidden />
        <h3 className="modal-title">{ev.title}</h3>
        <p className="event-desc">{ev.desc}</p>
        <div className="event-actions">
          <button
            className="event-btn accept"
            disabled={cantAfford}
            onClick={() => resolveEvent(true)}
          >
            {ev.accept}
            {cantAfford && <em className="event-note">精华不足</em>}
          </button>
          <button className="event-btn decline" onClick={() => resolveEvent(false)}>
            {ev.decline}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
