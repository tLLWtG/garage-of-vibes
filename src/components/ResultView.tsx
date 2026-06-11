import { motion } from 'framer-motion';
import { useGame } from '../game/store';
import { SEEDS } from '../game/seeds';
import type { SeedId } from '../game/types';
import { SeedIcon, MiscIcon } from './icons';

export function ResultView() {
  const result = useGame((s) => s.result);
  const backToFarm = useGame((s) => s.backToFarm);
  if (!result) return null;

  const seedEntries = Object.entries(result.seeds) as [SeedId, number][];

  return (
    <motion.div
      className="view result-view"
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.32 }}
    >
      <div
        className={`result-card ${result.died ? 'died' : ''} ${result.victory ? 'victory' : ''}`}
      >
        {result.victory && <div className="victory-rays" aria-hidden />}
        <h2 className="result-title">
          {result.victory
            ? '大地之心已被收割'
            : result.died
              ? '倒在了地底'
              : result.perfect
                ? '完美收割！'
                : '满载而归'}
        </h2>
        <p className="result-sub">
          {result.victory
            ? '你亲手种出了所有地牢的母核，又亲手战胜了它。这片田地再无秘密——但种子还在，下一季依然会来。'
            : result.died
              ? '黑暗吞没了你……一半的收获散落在了地牢里。'
              : result.perfect
                ? '你清空了自己种下的每一个房间，大地以厚礼相赠。'
                : '你带着收获回到了地表。'}
        </p>

        <div className="result-stats">
          <div className="result-stat">
            <span className="rs-label">精华</span>
            <span className="rs-value">
              <MiscIcon kind="essence" size={18} color="#6fc3ff" />
              {result.essence}
            </span>
          </div>
          <div className="result-stat">
            <span className="rs-label">房间清理</span>
            <span className="rs-value">
              {result.clearedRooms}/{result.totalRooms}
            </span>
          </div>
          <div className="result-stat">
            <span className="rs-label">最深抵达</span>
            <span className="rs-value">{result.deepest}</span>
          </div>
        </div>

        <div className="result-seeds">
          <h4>带回的种子</h4>
          {seedEntries.length === 0 ? (
            <p className="hint-text">这一趟没有带回种子。</p>
          ) : (
            <div className="seed-haul">
              {seedEntries.map(([id, n]) => (
                <span
                  className="haul-chip"
                  key={id}
                  style={{ ['--seed-color' as string]: SEEDS[id].color }}
                >
                  <SeedIcon id={id} size={18} />
                  {SEEDS[id].name} ×{n}
                  {result.bonusSeed === id && <em className="bonus-mark">含完美奖励</em>}
                </span>
              ))}
            </div>
          )}
        </div>

        <button className="descend-btn" onClick={backToFarm}>
          {result.victory
            ? `继续耕种 · 第 ${result.season + 1} 季（无尽）`
            : `回到农田 · 第 ${result.season + 1} 季`}
        </button>
      </div>
    </motion.div>
  );
}
