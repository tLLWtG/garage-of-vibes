/**
 * 文章元数据的纯函数解析：浏览器端（content.ts）与
 * 构建端（vite.config.ts 的静态产物插件）共用，避免逻辑漂移。
 */

export function parseFrontmatter(src: string): { data: Record<string, string>; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(src);
  if (!match) return { data: {}, body: src };
  const data: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const sep = line.indexOf(':');
    if (sep < 0) continue;
    const key = line.slice(0, sep).trim();
    const value = line
      .slice(sep + 1)
      .trim()
      .replace(/^["']|["']$/g, '');
    if (key) data[key] = value;
  }
  return { data, body: src.slice(match[0].length) };
}

/** 规范化为补零的 YYYY-MM-DD：frontmatter 里写 2026-1-5 也能按字符串正确排序 */
export function normalizeDate(date: string): string {
  const [y, m, d] = date.split('-').map((v) => parseInt(v, 10));
  if (!y || !m || !d) return date;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function formatDate(date: string): string {
  const [y, m, d] = date.split('-').map((v) => parseInt(v, 10));
  if (!y || !m || !d) return date;
  return `${y} 年 ${m} 月 ${d} 日`;
}
