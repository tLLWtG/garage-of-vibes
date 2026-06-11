import { motion } from 'framer-motion';
import { useGame } from '../game/store';
import { WEATHERS } from '../game/weather';
import { MiscIcon, WeatherIcon } from './icons';

const WEATHER_COLOR: Record<string, string> = {
  sun: '#ffd166',
  rain: '#6fc3ff',
  drought: '#ff9d6f',
  fog: '#b8a6e8',
  frost: '#9fd8ff',
  harvest: '#ffe9a0',
};

export function HUD() {
  const phase = useGame((s) => s.phase);
  const season = useGame((s) => s.season);
  const essence = useGame((s) => s.essence);
  const water = useGame((s) => s.water);
  const waterMax = useGame((s) => s.waterMax);
  const weather = useGame((s) => s.weather);
  const muted = useGame((s) => s.muted);
  const toggleMute = useGame((s) => s.toggleMute);
  const run = useGame((s) => s.run);

  const W = WEATHERS[weather];

  return (
    <header className="hud">
      <div className="hud-left">
        <span className="logo" title="Seed the Dungeon">
          <span className="logo-mark">❖</span> 明明只是种田，为什么会长出魔王城啊？
        </span>
        <span className="season-chip">第 {season} 季</span>
        <span className={`weather-chip w-${weather}`} title={W.desc}>
          <WeatherIcon id={weather} size={15} color={WEATHER_COLOR[weather]} /> {W.name}
        </span>
        <span className="phase-chip">
          {phase === 'farm' ? '种植 · 地表' : phase === 'dungeon' ? '探索 · 地底' : '结算'}
        </span>
      </div>
      <div className="hud-right">
        {phase === 'dungeon' && run ? (
          <>
            <motion.span
              key={run.hp}
              className="stat hp"
              initial={{ scale: 1.25 }}
              animate={{ scale: 1 }}
            >
              <MiscIcon kind="hp" color="#ff6b81" /> {run.hp}/{run.maxHp}
            </motion.span>
            <span className="stat">
              <MiscIcon kind="potion" color="#7ee08a" /> ×{run.potions}
            </span>
            <span className="stat loot">
              <MiscIcon kind="essence" color="#6fc3ff" /> +{run.gainedEssence}
            </span>
          </>
        ) : (
          <>
            <span className="stat">
              <MiscIcon kind="essence" color="#6fc3ff" /> {essence}
            </span>
            {phase === 'farm' && (
              <span className="stat">
                <MiscIcon kind="water" color="#6fc3ff" /> {water}/{waterMax}
              </span>
            )}
          </>
        )}
        <button
          className="mute-btn"
          onClick={toggleMute}
          title={muted ? '开启音效' : '静音'}
          aria-label={muted ? '开启音效' : '静音'}
        >
          <MiscIcon kind={muted ? 'mute' : 'sound'} size={16} />
        </button>
      </div>
    </header>
  );
}
