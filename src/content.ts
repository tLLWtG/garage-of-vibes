import { marked } from 'marked';
import { parseFrontmatter, normalizeDate, formatDate } from './postMeta';

export interface Post {
  slug: string;
  index: number;
  title: string;
  date: string;
  dateLabel: string;
  summary: string;
  variant: string;
  html: string;
  /** 去除 Markdown 语法的正文纯文本，供馆藏检索使用 */
  plain: string;
  minutes: number;
}

marked.setOptions({ gfm: true });

const files = import.meta.glob('../content/posts/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

function estimateMinutes(body: string): number {
  const text = body.replace(/```[\s\S]*?```/g, ' ').replace(/[#>*`\-[\]()!]/g, '');
  const cjk = (text.match(/[\u4e00-\u9fff]/g) ?? []).length;
  const words = (text.replace(/[\u4e00-\u9fff]/g, ' ').match(/[A-Za-z0-9]+/g) ?? []).length;
  return Math.max(1, Math.round((cjk + words * 1.6) / 360));
}

/** 剥掉 Markdown 语法、保留可读文本（代码块内容保留，供检索命中） */
function toPlain(body: string): string {
  return body
    .replace(/```[^\n]*\n([\s\S]*?)```/g, ' $1 ')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, ' $1 ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, ' $1 ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/[*_~`]/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 读取全部文章，按日期从新到旧排序（入口处是最新一篇）。 */
export function loadPosts(): Post[] {
  const posts: Post[] = Object.entries(files).map(([path, src]) => {
    const slug = path.split('/').pop()!.replace(/\.md$/, '');
    const { data, body } = parseFrontmatter(src);
    const date = normalizeDate(data.date ?? '1970-01-01');
    return {
      slug,
      index: 0,
      title: data.title ?? slug,
      date,
      dateLabel: formatDate(date),
      summary: data.summary ?? '',
      variant: data.variant ?? '',
      html: marked.parse(body, { async: false }) as string,
      plain: toPlain(body),
      minutes: estimateMinutes(body),
    };
  });
  posts.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  posts.forEach((p, i) => (p.index = i));
  return posts;
}
