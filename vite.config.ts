import { defineConfig, type Plugin, type ViteDevServer } from 'vite';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { marked } from 'marked';
import { parseFrontmatter, normalizeDate, formatDate } from './src/postMeta';

/** 站点部署地址：feed.xml / sitemap.xml 里的绝对链接以它为准（保留末尾斜杠） */
const SITE_URL = 'https://tllwtg.github.io/garage-of-vibes/';
const SITE_TITLE = 'NOCTURNE · 夜曲画廊';
const SITE_DESC =
  'NOCTURNE 夜曲画廊：一座可以漫步的 3D 博客美术馆。文章如画作悬挂于长廊两侧，滚动漫游，点击阅读。';

// ------------------------------------------------------------------ 静态产物
// 3D 画廊里的文章对爬虫、RSS 读者与无 JS 环境完全不可见，
// 构建时把同一批 Markdown 渲染成文字版归档 / RSS / sitemap。

interface StaticPost {
  slug: string;
  title: string;
  date: string;
  dateLabel: string;
  summary: string;
  html: string;
}

function loadStaticPosts(root: string): StaticPost[] {
  const dir = join(root, 'content', 'posts');
  const posts = readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((file) => {
      const { data, body } = parseFrontmatter(readFileSync(join(dir, file), 'utf8'));
      const slug = file.replace(/\.md$/, '');
      const date = normalizeDate(data.date ?? '1970-01-01');
      return {
        slug,
        title: data.title ?? slug,
        date,
        dateLabel: formatDate(date),
        summary: data.summary ?? '',
        html: marked.parse(body, { async: false, gfm: true }) as string,
      };
    });
  posts.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return posts;
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const escapeXml = escapeHtml;

const postUrl = (slug: string) => `${SITE_URL}#/p/${encodeURIComponent(slug)}`;
const rfc822 = (date: string) => new Date(`${date}T00:00:00+08:00`).toUTCString();

function renderArchive(posts: StaticPost[]): string {
  const items = posts
    .map(
      (p, i) => `
    <article id="${escapeHtml(p.slug)}">
      <h2><a href="./#/p/${encodeURIComponent(p.slug)}">No.${String(i + 1).padStart(2, '0')} · ${escapeHtml(p.title)}</a></h2>
      <p class="meta">${escapeHtml(p.dateLabel)}</p>
      <p class="summary">${escapeHtml(p.summary)}</p>
      <div class="body">${p.html}</div>
    </article>`,
    )
    .join('\n');

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>馆藏归档 · ${SITE_TITLE}</title>
    <meta name="description" content="${escapeHtml(SITE_DESC)}" />
    <link rel="alternate" type="application/rss+xml" title="${SITE_TITLE}" href="./feed.xml" />
    <style>
      body { margin: 0 auto; max-width: 720px; padding: 56px 24px 96px; background: #070709; color: #d8d3c8;
             font: 16px/2 'Noto Serif SC', 'Songti SC', 'SimSun', serif; }
      a { color: #e8e2d4; text-decoration-color: rgba(232, 226, 212, 0.4); text-underline-offset: 4px; }
      header { margin-bottom: 64px; }
      header h1 { font-size: 22px; letter-spacing: 0.3em; color: #e8e2d4; }
      header p { color: #837e72; font-size: 13px; }
      article { margin-bottom: 84px; border-top: 1px solid rgba(232, 226, 212, 0.12); padding-top: 40px; }
      article h2 { font-size: 21px; line-height: 1.5; color: #e8e2d4; }
      article h2 a { text-decoration: none; }
      .meta { color: #837e72; font-size: 13px; }
      .summary { color: #b4aea1; }
      .body h2 { font-size: 18px; margin-top: 2.2em; }
      .body pre { background: #101014; border: 1px solid rgba(232, 226, 212, 0.08); border-radius: 8px;
                  padding: 18px 20px; overflow-x: auto; font-size: 13px; line-height: 1.8; }
      .body code { font-family: ui-monospace, Consolas, monospace; }
      .body blockquote { margin: 1.6em 0; padding-left: 22px; border-left: 1px solid rgba(232, 226, 212, 0.4); color: #b4aea1; }
    </style>
  </head>
  <body>
    <header>
      <h1>${SITE_TITLE}</h1>
      <p>文字版归档 · <a href="./">进入 3D 画廊</a> · <a href="./feed.xml">RSS</a></p>
    </header>
    <main>${items}</main>
  </body>
</html>
`;
}

function renderFeed(posts: StaticPost[]): string {
  const items = posts
    .map(
      (p) => `
    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${escapeXml(postUrl(p.slug))}</link>
      <guid isPermaLink="false">${escapeXml(p.slug)}</guid>
      <pubDate>${rfc822(p.date)}</pubDate>
      <description>${escapeXml(p.summary)}</description>
      <content:encoded><![CDATA[${p.html}]]></content:encoded>
    </item>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(SITE_TITLE)}</title>
    <link>${escapeXml(SITE_URL)}</link>
    <description>${escapeXml(SITE_DESC)}</description>
    <language>zh-cn</language>
    <atom:link href="${escapeXml(SITE_URL)}feed.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;
}

function renderSitemap(posts: StaticPost[]): string {
  const lastmod = posts[0]?.date ?? '1970-01-01';
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${escapeXml(SITE_URL)}</loc><lastmod>${lastmod}</lastmod></url>
  <url><loc>${escapeXml(SITE_URL)}archive.html</loc><lastmod>${lastmod}</lastmod></url>
</urlset>
`;
}

function nocturneStatic(): Plugin {
  let root = process.cwd();
  const pages: Record<string, { type: string; render(posts: StaticPost[]): string }> = {
    '/archive.html': { type: 'text/html; charset=utf-8', render: renderArchive },
    '/feed.xml': { type: 'application/xml; charset=utf-8', render: renderFeed },
    '/sitemap.xml': { type: 'application/xml; charset=utf-8', render: renderSitemap },
  };
  return {
    name: 'nocturne-static',
    configResolved(config) {
      root = config.root;
    },
    // dev 下也能访问 /archive.html、/feed.xml、/sitemap.xml
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req, res, next) => {
        const page = pages[(req.url ?? '').split('?')[0]];
        if (!page) return next();
        res.setHeader('Content-Type', page.type);
        res.end(page.render(loadStaticPosts(root)));
      });
    },
    generateBundle() {
      const posts = loadStaticPosts(root);
      for (const [url, page] of Object.entries(pages)) {
        this.emitFile({ type: 'asset', fileName: url.slice(1), source: page.render(posts) });
      }
    },
  };
}

// ------------------------------------------------------------------ 字体瘦身
// 项目要求 WebGL2，支持面严格小于 woff2：产物里的 .woff 回退纯属死重，
// 剔除后 @font-face 声明与 dist 体积都近乎减半。
function stripWoffFallback(): Plugin {
  return {
    name: 'strip-woff-fallback',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      for (const [name, item] of Object.entries(bundle)) {
        if (item.type === 'asset' && name.endsWith('.css') && typeof item.source === 'string') {
          item.source = item.source.replace(
            /,\s*url\([^)]*\.woff\)\s*format\(["']?woff["']?\)/g,
            '',
          );
        }
      }
      for (const name of Object.keys(bundle)) {
        if (name.endsWith('.woff')) delete bundle[name];
      }
    },
  };
}

export default defineConfig({
  base: './',
  server: {
    port: 5173,
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1200,
  },
  plugins: [nocturneStatic(), stripWoffFallback()],
});
