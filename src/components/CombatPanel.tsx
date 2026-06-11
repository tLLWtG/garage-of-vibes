import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGame } from '../game/store';
import { INTENT_LABEL, intentDamage } from '../game/combat';
import { SEEDS } from '../game/seeds';
import type { Enemy } from '../game/types';
import { EnemyIcon, MiscIcon } from './icons';

function EnemyCard({
  enemy,
  selected,
  onSelect,
}: {
  enemy: Enemy;
  selected: boolean;
  onSelect: () => void;
}) {
  const dead = enemy.hp <= 0;
  const prevHp = useRef(enemy.hp);
  const [hit, setHit] = useState<number | null>(null);

  useEffect(() => {
    if (enemy.hp < prevHp.current) {
      setHit(prevHp.current - enemy.hp);
      const t = setTimeout(() => setHit(null), 700);
      prevHp.current = enemy.hp;
      return () => clearTimeout(t);
    }
    prevHp.current = enemy.hp;
  }, [enemy.hp]);

  return (
    <motion.button
      className={`enemy-card ${selected ? 'selected' : ''} ${dead ? 'dead' : ''} ${enemy.enraged && !dead ? 'enraged' : ''}`}
      onClick={onSelect}
      disabled={dead}
      animate={hit != null ? { x: [0, -7, 6, -3, 0] } : {}}
      transition={{ duration: 0.32 }}
    >
      <AnimatePresence>
        {hit != null && (
          <motion.span
            className="dmg-float"
            initial={{ opacity: 1, y: 0, scale: 1 }}
            animate={{ opacity: 0, y: -30, scale: 1.25 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.65 }}
          >
            -{hit}
          </motion.span>
        )}
      </AnimatePresence>
      <EnemyIcon
        kind={enemy.kind}
        size={34}
        color={enemy.enraged ? '#ff5c5c' : enemy.ignited ? '#ff8a5c' : '#e8eef7'}
      />
      <span className="enemy-name">
        {enemy.enraged && <em className="enrage-tag">狂怒</em>}
        {enemy.name}
      </span>
      <div className="enemy-hp-bar">
        <motion.div
          className="enemy-hp-fill"
          animate={{ width: `${Math.max(0, (enemy.hp / enemy.maxHp) * 100)}%` }}
          transition={{ type: 'spring', stiffness: 240, damping: 28 }}
        />
      </div>
      <span className="enemy-hp-num">
        {Math.max(0, enemy.hp)}/{enemy.maxHp}
      </span>
      {!dead && (
        <span className={`intent ${enemy.intent}`}>
          <MiscIcon
            kind={
              enemy.intent === 'attack'
                ? 'atk'
                : enemy.intent === 'charge'
                  ? 'charge'
                  : enemy.intent === 'summon'
                    ? 'summon'
                    : 'smash'
            }
            size={12}
          />
          {INTENT_LABEL[enemy.intent]}
          {intentDamage(enemy) > 0 && ` ${intentDamage(enemy)}`}
        </span>
      )}
      {dead && <span className="intent dead-label">已消灭</span>}
    </motion.button>
  );
}

export function CombatPanel() {
  const run = useGame((s) => s.run)!;
  const act = useGame((s) => s.act);
  const room = run.rooms[run.combatRoom!];
  const [target, setTarget] = useState<string | null>(null);

  const playerHpRef = useRef(run.hp);
  const [playerHit, setPlayerHit] = useState(false);
  useEffect(() => {
    if (run.hp < playerHpRef.current) {
      setPlayerHit(true);
      const t = setTimeout(() => setPlayerHit(false), 420);
      playerHpRef.current = run.hp;
      return () => clearTimeout(t);
    }
    playerHpRef.current = run.hp;
  }, [run.hp]);

  if (!room) return null;
  const alive = room.enemies.filter((e) => e.hp > 0);
  const effTarget = alive.some((e) => e.key === target) ? target! : alive[0]?.key;
  const def = SEEDS[room.seedId];

  return (
    <motion.div
      className="overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className={`modal combat-modal ${playerHit ? 'player-hit' : ''}`}
        initial={{ scale: 0.88, y: 22 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      >
        <h3 className="modal-title" style={{ ['--seed-color' as string]: def.color }}>
          {def.roomName}
          {room.ignited && (
            <span className="title-tag fire">
              <MiscIcon kind="flame" size={13} color="#ff8a5c" /> 燃烧
            </span>
          )}
          <span className="title-tag">深度 {room.depth} · 奖励 ×{room.rewardMult.toFixed(2)}</span>
        </h3>

        <div className="enemy-row">
          {room.enemies.map((e) => (
            <EnemyCard
              key={e.key}
              enemy={e}
              selected={e.key === effTarget}
              onSelect={() => setTarget(e.key)}
            />
          ))}
        </div>

        <div className="combat-player">
          <div className="combat-hp">
            <MiscIcon kind="hp" size={15} color="#ff6b81" />
            <div className="hp-bar">
              <motion.div
                className="hp-fill"
                animate={{ width: `${Math.max(0, (run.hp / run.maxHp) * 100)}%` }}
              />
            </div>
            <span>
              {run.hp}/{run.maxHp}
            </span>
          </div>
          <div className="combat-log">
            {run.log.slice(0, 3).map((l) => (
              <div key={l.id} className={`log-row ${l.tone}`}>
                {l.text}
              </div>
            ))}
          </div>
        </div>

        <div className="action-row">
          <button className="action-btn" onClick={() => act('attack', effTarget)}>
            <MiscIcon kind="atk" size={17} />
            <span>攻击</span>
            <em>{run.atk}</em>
          </button>
          <button
            className="action-btn heavy"
            disabled={run.heavyCd > 0}
            onClick={() => act('heavy', effTarget)}
            title="双倍伤害，但本回合受到的伤害 ×1.5"
          >
            <MiscIcon kind="smash" size={17} />
            <span>重击</span>
            <em>{run.heavyCd > 0 ? `冷却${run.heavyCd}` : run.atk * 2}</em>
          </button>
          <button
            className="action-btn guard"
            onClick={() => act('guard')}
            title="本回合受到的伤害降至 30%"
          >
            <MiscIcon kind="guard" size={17} />
            <span>格挡</span>
            <em>-70%</em>
          </button>
          <button
            className="action-btn potion"
            disabled={run.potions <= 0}
            onClick={() => act('potion')}
            title="回复 40% 最大生命（消耗回合）"
          >
            <MiscIcon kind="potion" size={17} />
            <span>药水</span>
            <em>×{run.potions}</em>
          </button>
          <button
            className="action-btn flee"
            onClick={() => act('flee')}
            title="撤退回上一间房：每个存活敌人都会趁机打你一下"
          >
            <MiscIcon kind="flee" size={17} />
            <span>撤退</span>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
