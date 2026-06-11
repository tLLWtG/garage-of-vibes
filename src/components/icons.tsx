import type { EnemyKind, SeedId, WeatherId } from '../game/types';
import { SEEDS } from '../game/seeds';

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
}

const base = (size: number, className?: string) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none' as const,
  className,
  'aria-hidden': true,
});

/** 种子 / 房间图标（极简几何） */
export function SeedIcon({
  id,
  size = 22,
  color,
  className,
}: IconProps & { id: SeedId }) {
  const c = color ?? SEEDS[id].color;
  switch (id) {
    case 'gate':
      return (
        <svg {...base(size, className)}>
          <path
            d="M5 20v-8a7 7 0 0 1 14 0v8"
            stroke={c}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path d="M3.5 20h17" stroke={c} strokeWidth="2" strokeLinecap="round" />
          <path d="M12 20v-6" stroke={c} strokeWidth="1.6" strokeLinecap="round" opacity=".55" />
        </svg>
      );
    case 'copper':
      return (
        <svg {...base(size, className)}>
          <path d="M12 21V11" stroke={c} strokeWidth="2" strokeLinecap="round" />
          <path
            d="M12 12c0-4.5 3.2-6.8 6.8-6.8 0 4.5-2.3 6.8-6.8 6.8Z"
            fill={c}
          />
          <path
            d="M12 15.5c0-3.4-2.4-5.1-5.1-5.1 0 3.4 1.7 5.1 5.1 5.1Z"
            fill={c}
            opacity=".6"
          />
        </svg>
      );
    case 'dew':
      return (
        <svg {...base(size, className)}>
          <path
            d="M12 3.5c3.6 4.6 6 7.7 6 11a6 6 0 1 1-12 0c0-3.3 2.4-6.4 6-11Z"
            fill={c}
            opacity=".85"
          />
          <path
            d="M9.2 14.5a3 3 0 0 0 2 3.1"
            stroke="#fff"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity=".7"
          />
        </svg>
      );
    case 'briar':
      return (
        <svg {...base(size, className)}>
          <path
            d="M12 3v18M5 7l14 10M19 7L5 17"
            stroke={c}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <circle cx="12" cy="12" r="2.6" fill={c} />
        </svg>
      );
    case 'heart':
      return (
        <svg {...base(size, className)}>
          <path
            d="M12 20.5C7 16.5 4 13.6 4 10.2 4 7.9 5.8 6 8.1 6c1.6 0 3 .9 3.9 2.3C12.9 6.9 14.3 6 15.9 6 18.2 6 20 7.9 20 10.2c0 3.4-3 6.3-8 10.3Z"
            fill={c}
            opacity=".9"
          />
        </svg>
      );
    case 'ember':
      return (
        <svg {...base(size, className)}>
          <path
            d="M12 3c1 3-0.5 4.6-1.8 6C8.8 10.5 7 12 7 15a5 5 0 0 0 10 0c0-2.2-1-3.8-2-5.2-.8-1.2-1.5-2.4-1-4.3"
            fill={c}
            opacity=".9"
          />
          <path
            d="M12 21a3 3 0 0 0 3-3c0-1.4-.8-2.4-1.6-3.4-.5-.7-1-1.3-1.4-2.2-.4.9-.9 1.5-1.4 2.2-.8 1-1.6 2-1.6 3.4a3 3 0 0 0 3 3Z"
            fill="#ffd95c"
            opacity=".95"
          />
        </svg>
      );
    case 'glimmer':
      return (
        <svg {...base(size, className)}>
          <path d="M12 3.5 18.5 12 12 20.5 5.5 12 12 3.5Z" fill={c} opacity=".9" />
          <path d="M12 7.5 15.2 12 12 16.5 8.8 12 12 7.5Z" fill="#fff" opacity=".45" />
        </svg>
      );
    case 'mistbell':
      return (
        <svg {...base(size, className)}>
          <path
            d="M12 4a6 6 0 0 1 6 6v4l1.5 2.5H4.5L6 14v-4a6 6 0 0 1 6-6Z"
            fill={c}
            opacity=".85"
          />
          <circle cx="12" cy="19.5" r="1.6" fill={c} />
          <path d="M4 7.5Q6 6.5 8 7.5M16 7.5q2-1 4 0" stroke={c} strokeWidth="1.2" strokeLinecap="round" opacity=".5" />
        </svg>
      );
    case 'crownseed':
      return (
        <svg {...base(size, className)}>
          <path
            d="M5 8.5 8.5 12 12 6l3.5 6L19 8.5 17.8 16H6.2L5 8.5Z"
            fill={c}
            opacity=".9"
          />
          <rect x="6.2" y="17.5" width="11.6" height="2.5" rx="1" fill={c} opacity=".7" />
          <circle cx="12" cy="11.5" r="1.3" fill="#fff" opacity=".55" />
        </svg>
      );
    case 'steamroot':
      return (
        <svg {...base(size, className)}>
          <path
            d="M12 9c2.8 3.4 4.5 5.6 4.5 8a4.5 4.5 0 1 1-9 0c0-2.4 1.7-4.6 4.5-8Z"
            fill={c}
            opacity=".85"
          />
          <path
            d="M8 5.5q2-1.4 4 0t4 0M9 2.8q1.5-1 3 0t3 0"
            stroke={c}
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity=".7"
          />
        </svg>
      );
    case 'ironbur':
      return (
        <svg {...base(size, className)}>
          <path d="M12 6.5 17.5 12 12 17.5 6.5 12 12 6.5Z" fill={c} opacity=".9" />
          <path
            d="M12 6.5V2.5M12 17.5v4M6.5 12h-4M17.5 12h4M8 8 5.5 5.5M16 8l2.5-2.5M8 16l-2.5 2.5M16 16l2.5 2.5"
            stroke={c}
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'lumenheart':
      return (
        <svg {...base(size, className)}>
          <path
            d="M12 19.5C8.2 16.4 5.8 14.2 5.8 11.6c0-1.8 1.4-3.2 3.1-3.2 1.2 0 2.3.7 3.1 1.8.8-1.1 1.9-1.8 3.1-1.8 1.7 0 3.1 1.4 3.1 3.2 0 2.6-2.4 4.8-6.2 7.9Z"
            fill={c}
            opacity=".95"
          />
          <path
            d="M12 2.5v2.6M12 22v-1M3 12h2.2M18.8 12H21M5.5 5.5l1.6 1.6M18.5 5.5l-1.6 1.6"
            stroke={c}
            strokeWidth="1.6"
            strokeLinecap="round"
            opacity=".8"
          />
        </svg>
      );
    case 'blight':
      return (
        <svg {...base(size, className)}>
          <path d="M12 21V9" stroke={c} strokeWidth="2" strokeLinecap="round" />
          <path
            d="M12 10C9 10 6.8 8 6.8 4.6c2.2-.4 4 .3 5.2 1.8C13.2 4.9 15 4.2 17.2 4.6 17.2 8 15 10 12 10Z"
            fill={c}
            opacity=".8"
          />
          <path
            d="M8.5 14 5.8 12.6M15.5 14l2.7-1.4M9 18l-2.6.8M15 18l2.6.8"
            stroke={c}
            strokeWidth="1.6"
            strokeLinecap="round"
            opacity=".7"
          />
          <circle cx="12" cy="6.8" r="1" fill="#11161f" opacity=".55" />
        </svg>
      );
    case 'worldheart':
      return (
        <svg {...base(size, className)}>
          <circle cx="12" cy="12" r="5" fill={c} opacity=".95" />
          <circle cx="12" cy="12" r="2.2" fill="#fff" opacity=".5" />
          <path
            d="M12 7V3M12 17v4M7 12H3M17 12h4M8.4 8.4 5.6 5.6M15.6 8.4l2.8-2.8M8.4 15.6l-2.8 2.8M15.6 15.6l2.8 2.8"
            stroke={c}
            strokeWidth="1.7"
            strokeLinecap="round"
            opacity=".75"
          />
        </svg>
      );
  }
}

/** 天气图标 */
export function WeatherIcon({
  id,
  size = 18,
  color = 'currentColor',
  className,
}: IconProps & { id: WeatherId }) {
  switch (id) {
    case 'sun':
      return (
        <svg {...base(size, className)}>
          <circle cx="12" cy="12" r="4.5" fill={color} opacity=".9" />
          <path
            d="M12 4V2M12 22v-2M4 12H2M22 12h-2M6 6 4.6 4.6M18 6l1.4-1.4M6 18l-1.4 1.4M18 18l1.4 1.4"
            stroke={color}
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'rain':
      return (
        <svg {...base(size, className)}>
          <path
            d="M7 13a5 5 0 1 1 1-9.9A6 6 0 0 1 19.5 6 4 4 0 0 1 18 13H7Z"
            fill={color}
            opacity=".8"
          />
          <path
            d="M8.5 16.5 7.5 19M12.5 16.5l-1 2.5M16.5 16.5l-1 2.5"
            stroke={color}
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'drought':
      return (
        <svg {...base(size, className)}>
          <circle cx="12" cy="9" r="4" fill={color} opacity=".9" />
          <path
            d="M12 2.5V1M5.5 9H4M20 9h-1.5M7.4 4.4 6.3 3.3M16.6 4.4l1.1-1.1"
            stroke={color}
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M5 16q2-1.4 4 0t4 0 4 0M5 19.5q2-1.4 4 0t4 0 4 0"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity=".7"
          />
        </svg>
      );
    case 'fog':
      return (
        <svg {...base(size, className)}>
          <path
            d="M4 8h13M7 12h13M4 16h11M9 20h9"
            stroke={color}
            strokeWidth="1.8"
            strokeLinecap="round"
            opacity=".85"
          />
        </svg>
      );
    case 'frost':
      return (
        <svg {...base(size, className)}>
          <path
            d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9"
            stroke={color}
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M12 3 10 5.5M12 3l2 2.5M12 21l-2-2.5M12 21l2-2.5"
            stroke={color}
            strokeWidth="1.4"
            strokeLinecap="round"
            opacity=".8"
          />
        </svg>
      );
    case 'harvest':
      return (
        <svg {...base(size, className)}>
          <path
            d="M19 14.5A8 8 0 0 1 9.5 5 8 8 0 1 0 19 14.5Z"
            fill={color}
            opacity=".9"
          />
          <path
            d="M17 4.5v4M15 6.5h4"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity=".8"
          />
        </svg>
      );
  }
}

/** 敌人图标 */
export function EnemyIcon({
  kind,
  size = 26,
  color = '#e8eef7',
  className,
}: IconProps & { kind: EnemyKind }) {
  switch (kind) {
    case 'sprout':
      return (
        <svg {...base(size, className)}>
          <circle cx="12" cy="14" r="6" fill={color} opacity=".85" />
          <path
            d="M9 9 7 5.5M15 9l2-3.5"
            stroke={color}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <circle cx="10" cy="13.5" r="1.2" fill="#11161f" />
          <circle cx="14" cy="13.5" r="1.2" fill="#11161f" />
        </svg>
      );
    case 'beetle':
      return (
        <svg {...base(size, className)}>
          <ellipse cx="12" cy="13" rx="7" ry="6" fill={color} opacity=".85" />
          <path d="M12 7v12" stroke="#11161f" strokeWidth="1.4" />
          <path
            d="M5 10 3 8m16 2 2-2M5 16l-2 2m16-2 2 2"
            stroke={color}
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <circle cx="9.5" cy="11.5" r="1.1" fill="#11161f" />
          <circle cx="14.5" cy="11.5" r="1.1" fill="#11161f" />
        </svg>
      );
    case 'emberling':
      return (
        <svg {...base(size, className)}>
          <path
            d="M12 3.5c1 2.8-.4 4.2-1.6 5.5C9 10.5 7.5 12 7.5 14.7a4.5 4.5 0 0 0 9 0c0-2-1-3.5-1.9-4.8-.7-1.1-1.3-2.2-.8-3.9"
            fill={color}
            opacity=".9"
          />
          <circle cx="10.3" cy="14.5" r="1.2" fill="#11161f" />
          <circle cx="13.7" cy="14.5" r="1.2" fill="#11161f" />
        </svg>
      );
    case 'guardian':
      return (
        <svg {...base(size, className)}>
          <path
            d="M12 3 19 6v6c0 4.5-3 7.8-7 9-4-1.2-7-4.5-7-9V6l7-3Z"
            fill={color}
            opacity=".85"
          />
          <circle cx="9.5" cy="11" r="1.2" fill="#11161f" />
          <circle cx="14.5" cy="11" r="1.2" fill="#11161f" />
          <path d="M9 15h6" stroke="#11161f" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case 'ironshell':
      return (
        <svg {...base(size, className)}>
          <rect x="5" y="6" width="14" height="13" rx="3" fill={color} opacity=".9" />
          <path d="M5 11h14" stroke="#11161f" strokeWidth="1.3" opacity=".6" />
          <circle cx="9.5" cy="15" r="1.2" fill="#11161f" />
          <circle cx="14.5" cy="15" r="1.2" fill="#11161f" />
          <path d="M8 6V3.5M16 6V3.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'rootlord':
      return (
        <svg {...base(size, className)}>
          <path
            d="M7 21c.5-4-1-5.5-3-7 2-.5 3 .2 3 .2C7 10 8.5 7 12 5.5 15.5 7 17 10 17 14.2c0 0 1-.7 3-.2-2 1.5-3.5 3-3 7H7Z"
            fill={color}
            opacity=".88"
          />
          <path
            d="M4.5 21c1-1.4.8-2.6 0-3.8M19.5 21c-1-1.4-.8-2.6 0-3.8M12 5.5V2.8M9 4.2 8 2.5M15 4.2l1-1.7"
            stroke={color}
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <circle cx="9.8" cy="13" r="1.4" fill="#11161f" />
          <circle cx="14.2" cy="13" r="1.4" fill="#11161f" />
          <path d="M9.5 17h5" stroke="#11161f" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case 'worldheart':
      return (
        <svg {...base(size, className)}>
          <circle cx="12" cy="12" r="6" fill={color} opacity=".9" />
          <path
            d="M12 6V2M12 18v4M6 12H2M18 12h4M7.8 7.8 5 5M16.2 7.8 19 5M7.8 16.2 5 19M16.2 16.2 19 19"
            stroke={color}
            strokeWidth="1.8"
            strokeLinecap="round"
            opacity=".7"
          />
          <path
            d="M9.4 11.2c.6-1.5 1.6-2.3 2.6-2.3s2 .8 2.6 2.3c-.6 1.6-1.6 2.4-2.6 2.4s-2-.8-2.6-2.4Z"
            fill="#11161f"
            opacity=".75"
          />
          <circle cx="12" cy="11.3" r="1" fill="#fff" opacity=".9" />
          <path d="M9 15.6q3 1.8 6 0" stroke="#11161f" strokeWidth="1.4" strokeLinecap="round" opacity=".6" />
        </svg>
      );
  }
}

/** 通用小图标 */
export function MiscIcon({
  kind,
  size = 18,
  color = 'currentColor',
  className,
}: IconProps & {
  kind:
    | 'essence'
    | 'water'
    | 'wateringCan'
    | 'shovel'
    | 'potion'
    | 'lock'
    | 'hp'
    | 'atk'
    | 'flame'
    | 'shield'
    | 'spike'
    | 'warning'
    | 'check'
    | 'player'
    | 'depth'
    | 'guard'
    | 'flee'
    | 'charge'
    | 'smash'
    | 'summon'
    | 'hybrid'
    | 'building'
    | 'sound'
    | 'mute';
}) {
  switch (kind) {
    case 'essence':
      return (
        <svg {...base(size, className)}>
          <path d="M12 3 19 12l-7 9-7-9 7-9Z" fill={color} opacity=".9" />
          <path d="M12 6.8 15.8 12 12 17.2 8.2 12 12 6.8Z" fill="#fff" opacity=".4" />
        </svg>
      );
    case 'water':
    case 'wateringCan':
      return (
        <svg {...base(size, className)}>
          <path
            d="M8 9h7a4 4 0 0 1 4 4v1a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4v-2"
            stroke={color}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path d="M5 12 2.5 9.5M8 9V7h4v2" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
          <path d="M21 8l-2 2" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'shovel':
      return (
        <svg {...base(size, className)}>
          <path d="M13.5 10.5 19 5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
          <path
            d="M5 19c-.5-3 0-5 1.5-6.5l2-2 5 5-2 2C10 19 8 19.5 5 19Z"
            fill={color}
            opacity=".85"
          />
        </svg>
      );
    case 'potion':
      return (
        <svg {...base(size, className)}>
          <path d="M10 3h4M11 3v4M13 3v4" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
          <path
            d="M11 7 7.5 13a5 5 0 1 0 9 0L13 7"
            stroke={color}
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M8.2 14.5h7.6" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case 'lock':
      return (
        <svg {...base(size, className)}>
          <rect x="6" y="11" width="12" height="9" rx="2" fill={color} opacity=".8" />
          <path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3" stroke={color} strokeWidth="1.8" />
        </svg>
      );
    case 'hp':
      return (
        <svg {...base(size, className)}>
          <path
            d="M12 20.5C7 16.5 4 13.6 4 10.2 4 7.9 5.8 6 8.1 6c1.6 0 3 .9 3.9 2.3C12.9 6.9 14.3 6 15.9 6 18.2 6 20 7.9 20 10.2c0 3.4-3 6.3-8 10.3Z"
            fill={color}
          />
        </svg>
      );
    case 'atk':
      return (
        <svg {...base(size, className)}>
          <path d="M5 19 17 7l2-3-3 2L4 18l1 1Z" fill={color} opacity=".9" />
          <path d="m7 21 2-2-4-4-2 2c1.5.5 2.5 1.5 4 4Z" fill={color} />
        </svg>
      );
    case 'flame':
      return (
        <svg {...base(size, className)}>
          <path
            d="M12 3c1 3-.5 4.6-1.8 6C8.8 10.5 7 12 7 15a5 5 0 0 0 10 0c0-2.2-1-3.8-2-5.2-.8-1.2-1.5-2.4-1-4.3"
            fill={color}
          />
        </svg>
      );
    case 'shield':
    case 'guard':
      return (
        <svg {...base(size, className)}>
          <path d="M12 3 19 6v6c0 4.5-3 7.8-7 9-4-1.2-7-4.5-7-9V6l7-3Z" fill={color} opacity=".9" />
        </svg>
      );
    case 'spike':
      return (
        <svg {...base(size, className)}>
          <path d="M12 4v16M6 7l12 10M18 7 6 17" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'warning':
      return (
        <svg {...base(size, className)}>
          <path d="M12 3 22 20H2L12 3Z" fill={color} opacity=".9" />
          <path d="M12 9v5" stroke="#11161f" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="17" r="1.2" fill="#11161f" />
        </svg>
      );
    case 'check':
      return (
        <svg {...base(size, className)}>
          <path d="m5 12.5 4.5 4.5L19 7.5" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'player':
      return (
        <svg {...base(size, className)}>
          <circle cx="12" cy="8" r="4" fill={color} />
          <path d="M5 20a7 7 0 0 1 14 0" fill={color} opacity=".8" />
        </svg>
      );
    case 'depth':
      return (
        <svg {...base(size, className)}>
          <path d="M12 4v13m0 0 -5-5m5 5 5-5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5 21h14" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'flee':
      return (
        <svg {...base(size, className)}>
          <path d="M19 12H6m0 0 5-5m-5 5 5 5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'charge':
      return (
        <svg {...base(size, className)}>
          <circle cx="12" cy="12" r="7" stroke={color} strokeWidth="1.8" />
          <circle cx="12" cy="12" r="3" fill={color} opacity=".7" />
        </svg>
      );
    case 'smash':
      return (
        <svg {...base(size, className)}>
          <path d="M13 2 5 13h5l-1 9 8-12h-5l1-8Z" fill={color} />
        </svg>
      );
    case 'summon':
      return (
        <svg {...base(size, className)}>
          <path d="M4 20h16" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
          <path
            d="M7.5 20v-4M12 20v-7M16.5 20v-4"
            stroke={color}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M7.5 16 6 14m1.5 2L9 14M12 13l-1.8-2.2M12 13l1.8-2.2M16.5 16 15 14m1.5 2 1.5-2"
            stroke={color}
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'hybrid':
      return (
        <svg {...base(size, className)}>
          <circle cx="9" cy="12" r="5.5" stroke={color} strokeWidth="1.8" />
          <circle cx="15" cy="12" r="5.5" stroke={color} strokeWidth="1.8" opacity=".65" />
          <circle cx="12" cy="12" r="1.6" fill={color} />
        </svg>
      );
    case 'building':
      return (
        <svg {...base(size, className)}>
          <path d="M4 11 12 4l8 7" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M6.5 10.5V20h11v-9.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
          <rect x="10.2" y="14" width="3.6" height="6" rx=".8" fill={color} opacity=".8" />
        </svg>
      );
    case 'sound':
      return (
        <svg {...base(size, className)}>
          <path
            d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4Z"
            fill={color}
            opacity=".9"
          />
          <path
            d="M15 9q1.8 3 0 6M17.8 7q3 5 0 10"
            stroke={color}
            strokeWidth="1.7"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      );
    case 'mute':
      return (
        <svg {...base(size, className)}>
          <path
            d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4Z"
            fill={color}
            opacity=".9"
          />
          <path
            d="m15.5 9.5 5 5M20.5 9.5l-5 5"
            stroke={color}
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      );
  }
}

/** 成熟度圆点 */
export function MaturityDots({
  value,
  bonus = 0,
  size = 5,
}: {
  value: number;
  bonus?: number;
  size?: number;
}) {
  const eff = Math.min(3, value + bonus);
  return (
    <span className="maturity-dots">
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={
            i <= value
              ? 'dot full'
              : i <= eff
                ? 'dot bonus'
                : 'dot'
          }
          style={{ width: size, height: size }}
        />
      ))}
    </span>
  );
}
