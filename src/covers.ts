import * as THREE from 'three';
import type { Post } from './content';

/**
 * 生成式封面：以文章 slug 为种子，在离屏 Canvas 上绘制
 * 单色（墨 × 象牙）构图。同一篇文章永远得到同一幅画。
 */

export type CoverVariant = 'contours' | 'grain' | 'geo';
const VARIANTS: CoverVariant[] = ['contours', 'grain', 'geo'];

const COVER_W = 1024;
const COVER_H = 1280;

// ---------------------------------------------------------------- 随机数

function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededRandom(key: string): () => number {
  return mulberry32(xmur3(key)());
}

// ---------------------------------------------------------------- 值噪声

interface Noise {
  noise(x: number, y: number): number;
  fbm(x: number, y: number, octaves?: number): number;
}

function makeNoise(rand: () => number): Noise {
  const size = 128;
  const grid = new Float32Array(size * size);
  for (let i = 0; i < grid.length; i++) grid[i] = rand();
  const at = (x: number, y: number) =>
    grid[(((y % size) + size) % size) * size + (((x % size) + size) % size)];

  function noise(x: number, y: number): number {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);
    return (
      at(xi, yi) * (1 - u) * (1 - v) +
      at(xi + 1, yi) * u * (1 - v) +
      at(xi, yi + 1) * (1 - u) * v +
      at(xi + 1, yi + 1) * u * v
    );
  }

  function fbm(x: number, y: number, octaves = 4): number {
    let sum = 0;
    let amp = 0.5;
    let freq = 1;
    let norm = 0;
    for (let o = 0; o < octaves; o++) {
      sum += amp * noise(x * freq, y * freq);
      norm += amp;
      amp *= 0.5;
      freq *= 2.03;
    }
    return sum / norm;
  }

  return { noise, fbm };
}

// ---------------------------------------------------------------- 调色

interface Palette {
  bg: string;
  fg: string;
  dark: boolean;
}

const INK = '#15151a';
const IVORY = '#e7e0d1';

function pickPalette(rand: () => number): Palette {
  const dark = rand() < 0.66;
  return dark ? { bg: '#101013', fg: IVORY, dark } : { bg: '#e9e3d5', fg: INK, dark };
}

function rgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

// ---------------------------------------------------------------- 构图

function drawContours(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  rand: () => number,
  nz: Noise,
  pal: Palette,
) {
  const m = Math.round(W * 0.105);
  const innerH = H - m * 2;
  const rows = 58 + Math.floor(rand() * 20);
  const ox = rand() * 90;
  const oy = rand() * 90;
  const freq = 0.0022 + rand() * 0.0013;

  ctx.save();
  ctx.beginPath();
  ctx.rect(m * 0.62, m * 0.62, W - m * 1.24, H - m * 1.24);
  ctx.clip();

  ctx.strokeStyle = pal.fg;
  ctx.lineWidth = Math.max(1, W / 1024);
  for (let r = 0; r < rows; r++) {
    const ty = r / (rows - 1);
    const y0 = m + ty * innerH;
    const env = Math.sin(ty * Math.PI);
    const amp = innerH * 0.15 * (0.22 + env) * (0.45 + nz.fbm(8.1, ty * 3.2 + oy, 3));
    ctx.globalAlpha = 0.12 + 0.52 * Math.pow(nz.fbm(ty * 2.6 + oy, 3.7, 3), 1.7);
    ctx.beginPath();
    for (let x = m; x <= W - m; x += 6) {
      const n = nz.fbm(x * freq + ox, y0 * freq * 1.55 + oy, 4);
      const y = y0 + (n - 0.5) * 2 * amp;
      if (x === m) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawGrainGlow(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  rand: () => number,
  pal: Palette,
) {
  const m = Math.round(W * 0.105);
  const cx = W * (0.32 + rand() * 0.36);
  const cy = H * (0.22 + rand() * 0.22);

  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * (0.52 + rand() * 0.28));
  glow.addColorStop(0, rgba(pal.fg, pal.dark ? 0.22 : 0.16));
  glow.addColorStop(0.55, rgba(pal.fg, 0.05));
  glow.addColorStop(1, rgba(pal.fg, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = pal.fg;
  ctx.lineWidth = 1.2;
  ctx.globalAlpha = 0.5;
  const r1 = W * (0.2 + rand() * 0.1);
  ctx.beginPath();
  ctx.arc(cx, cy, r1, 0, Math.PI * 2);
  ctx.stroke();

  ctx.globalAlpha = 0.28;
  const a0 = rand() * Math.PI * 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r1 + 26 + rand() * 30, a0, a0 + Math.PI * (0.45 + rand() * 0.8));
  ctx.stroke();

  const hy = H * (0.6 + rand() * 0.18);
  ctx.globalAlpha = 0.34;
  ctx.beginPath();
  ctx.moveTo(m, hy);
  ctx.lineTo(W - m, hy);
  ctx.stroke();

  ctx.globalAlpha = 0.85;
  ctx.fillStyle = pal.fg;
  ctx.beginPath();
  ctx.arc(m + (W - 2 * m) * (0.18 + rand() * 0.64), hy, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawGeo(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  rand: () => number,
  pal: Palette,
) {
  const m = Math.round(W * 0.105);
  const cx = W * (0.36 + rand() * 0.28);
  const cy = H * (0.32 + rand() * 0.22);
  const R = W * (0.24 + rand() * 0.1);

  ctx.strokeStyle = pal.fg;
  ctx.fillStyle = pal.fg;

  ctx.globalAlpha = 0.85;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.stroke();

  ctx.globalAlpha = 0.3;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx, m);
  ctx.lineTo(cx, H - m);
  ctx.stroke();

  const ang = rand() * Math.PI * 2;
  ctx.globalAlpha = 0.95;
  ctx.beginPath();
  ctx.arc(cx + Math.cos(ang) * R, cy + Math.sin(ang) * R, W * 0.03, 0, Math.PI * 2);
  ctx.fill();

  const ry = H * (0.72 + rand() * 0.12);
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(m, ry);
  ctx.lineTo(m + (W - 2 * m) * (0.36 + rand() * 0.5), ry);
  ctx.stroke();

  if (rand() < 0.6) {
    const s = W * (0.12 + rand() * 0.08);
    ctx.globalAlpha = 0.32;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(W - m - s, H * (0.6 + rand() * 0.14), s, s);
  }
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- 质感

function applyGrain(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  rand: () => number,
  amount: number,
) {
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rand() - 0.5) * amount;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

function applyVignette(ctx: CanvasRenderingContext2D, W: number, H: number, pal: Palette) {
  const g = ctx.createRadialGradient(
    W / 2,
    H / 2,
    Math.min(W, H) * 0.34,
    W / 2,
    H / 2,
    Math.max(W, H) * 0.74,
  );
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, pal.dark ? 'rgba(0,0,0,0.3)' : 'rgba(54,48,40,0.16)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function drawInnerBorder(ctx: CanvasRenderingContext2D, W: number, H: number, pal: Palette) {
  const inset = Math.round(W * 0.052);
  ctx.strokeStyle = pal.fg;
  ctx.globalAlpha = 0.18;
  ctx.lineWidth = 1;
  ctx.strokeRect(inset, inset, W - inset * 2, H - inset * 2);
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- 出口

export function makeCoverCanvas(slug: string, variantIn?: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = COVER_W;
  canvas.height = COVER_H;
  const ctx = canvas.getContext('2d')!;
  const rand = seededRandom(slug);
  const nz = makeNoise(seededRandom(slug + ':noise'));
  const pal = pickPalette(rand);

  const variant: CoverVariant = VARIANTS.includes(variantIn as CoverVariant)
    ? (variantIn as CoverVariant)
    : VARIANTS[Math.floor(rand() * VARIANTS.length)];

  ctx.fillStyle = pal.bg;
  ctx.fillRect(0, 0, COVER_W, COVER_H);

  if (variant === 'contours') drawContours(ctx, COVER_W, COVER_H, rand, nz, pal);
  else if (variant === 'grain') drawGrainGlow(ctx, COVER_W, COVER_H, rand, pal);
  else drawGeo(ctx, COVER_W, COVER_H, rand, pal);

  drawInnerBorder(ctx, COVER_W, COVER_H, pal);
  applyGrain(ctx, COVER_W, COVER_H, seededRandom(slug + ':grain'), variant === 'grain' ? 24 : 13);
  applyVignette(ctx, COVER_W, COVER_H, pal);
  return canvas;
}

export function makeCoverTexture(slug: string, variant?: string): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(makeCoverCanvas(slug, variant));
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ---------------------------------------------------------------- 展签

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let cur = '';
  for (const ch of text) {
    const test = cur + ch;
    if (cur && ctx.measureText(test).width > maxWidth) {
      lines.push(cur);
      cur = ch;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

export function makePlaqueTexture(post: Post): THREE.CanvasTexture {
  const W = 512;
  const H = 288;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#e7e1d3';
  ctx.fillRect(0, 0, W, H);

  const pad = 44;
  const ink = '#1b1b1e';
  ctx.fillStyle = ink;
  ctx.strokeStyle = ink;

  // 细内框
  ctx.globalAlpha = 0.3;
  ctx.lineWidth = 1;
  ctx.strokeRect(13, 13, W - 26, H - 26);

  // 编号
  ctx.globalAlpha = 0.92;
  if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '5px';
  ctx.font = '500 38px "Cormorant Garamond", Georgia, serif';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(`No.${String(post.index + 1).padStart(2, '0')}`, pad, pad + 36);
  if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0px';

  // 分隔线
  ctx.globalAlpha = 0.24;
  ctx.beginPath();
  ctx.moveTo(pad, pad + 58);
  ctx.lineTo(W - pad, pad + 58);
  ctx.stroke();

  // 标题（最多两行）
  ctx.globalAlpha = 0.95;
  ctx.font = '700 40px "Noto Serif SC", "Songti SC", "SimSun", serif';
  const lines = wrapText(ctx, post.title, W - pad * 2);
  if (lines.length > 2) {
    lines.length = 2;
    lines[1] = lines[1].slice(0, -1) + '…';
  }
  lines.forEach((line, i) => ctx.fillText(line, pad, pad + 116 + i * 54));

  // 元信息
  ctx.globalAlpha = 0.55;
  ctx.font = '400 21px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillText(`${post.dateLabel} · 约 ${post.minutes} 分钟`, pad, H - 36);

  // 纸纹
  applyGrain(ctx, W, H, seededRandom(post.slug + ':plaque'), 8);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
