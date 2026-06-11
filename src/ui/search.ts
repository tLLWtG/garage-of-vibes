import type { Post } from '../content';

export interface SearchHandlers {
  /** 确认选中某篇文章（回车 / 点击） */
  onSelect(post: Post): void;
  /** 打开 / 关闭时机，用于冻结相机输入等 */
  onOpenChange(open: boolean): void;
}

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
}

/** 找出全部命中区间并合并重叠，供高亮使用 */
function findRanges(text: string, terms: string[]): Array<[number, number]> {
  const lower = text.toLowerCase();
  const ranges: Array<[number, number]> = [];
  for (const t of terms) {
    let i = 0;
    while ((i = lower.indexOf(t, i)) >= 0) {
      ranges.push([i, i + t.length]);
      i += Math.max(1, t.length);
    }
  }
  ranges.sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([r[0], r[1]]);
  }
  return merged;
}

function highlight(text: string, terms: string[]): string {
  if (!terms.length) return escapeHtml(text);
  const ranges = findRanges(text, terms);
  if (!ranges.length) return escapeHtml(text);
  let out = '';
  let pos = 0;
  for (const [s, e] of ranges) {
    out += `${escapeHtml(text.slice(pos, s))}<mark>${escapeHtml(text.slice(s, e))}</mark>`;
    pos = e;
  }
  return out + escapeHtml(text.slice(pos));
}

/** 正文命中时截取首个命中词附近的片段 */
function makeExcerpt(plain: string, terms: string[]): string | null {
  const lower = plain.toLowerCase();
  let first = -1;
  for (const t of terms) {
    const i = lower.indexOf(t);
    if (i >= 0 && (first < 0 || i < first)) first = i;
  }
  if (first < 0) return null;
  const start = Math.max(0, first - 24);
  const end = Math.min(plain.length, first + 72);
  const head = start > 0 ? '…' : '';
  const tail = end < plain.length ? '…' : '';
  return head + highlight(plain.slice(start, end), terms) + tail;
}

/** 多词 AND 匹配打分：标题 > 摘要 > 正文；任一词不命中返回 -1 */
function score(post: Post, terms: string[]): number {
  const title = post.title.toLowerCase();
  const summary = post.summary.toLowerCase();
  const plain = post.plain.toLowerCase();
  let s = 0;
  for (const t of terms) {
    if (title.includes(t)) s += 4;
    else if (summary.includes(t)) s += 2;
    else if (plain.includes(t)) s += 1;
    else return -1;
  }
  return s;
}

/**
 * 馆藏检索：墨色玻璃上的目录式检索台。
 * 打开即列出全部馆藏，输入即过滤；↑↓ 选择、Enter 前往、ESC 关闭。
 */
export class SearchOverlay {
  isOpen = false;

  private el: HTMLElement;
  private input: HTMLInputElement;
  private list: HTMLElement;
  private count: HTMLElement;
  private posts: Post[];
  private handlers: SearchHandlers;

  private hits: Post[] = [];
  private active = 0;
  private hideTimer: number | undefined;

  constructor(posts: Post[], handlers: SearchHandlers) {
    this.posts = posts;
    this.handlers = handlers;

    this.el = document.createElement('div');
    this.el.className = 'search';
    this.el.hidden = true;
    this.el.innerHTML = `
      <div class="search-backdrop"></div>
      <div class="search-panel">
        <span class="search-kicker">NOCTURNE · 馆藏检索</span>
        <input
          class="search-input"
          type="text"
          placeholder="检索标题、正文…"
          autocomplete="off"
          spellcheck="false"
          aria-label="检索馆藏"
        />
        <div class="search-count"></div>
        <ul class="search-list"></ul>
        <footer class="search-foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> 选择</span>
          <span><kbd>Enter</kbd> 前往</span>
          <span><kbd>ESC</kbd> 关闭</span>
        </footer>
      </div>
      <button class="search-close" aria-label="关闭检索">
        <span class="overlay-close-x">✕</span><span>关闭</span><kbd>ESC</kbd>
      </button>
    `;
    document.body.appendChild(this.el);

    this.input = this.el.querySelector('.search-input') as HTMLInputElement;
    this.list = this.el.querySelector('.search-list') as HTMLElement;
    this.count = this.el.querySelector('.search-count') as HTMLElement;

    (this.el.querySelector('.search-backdrop') as HTMLElement).addEventListener('click', () =>
      this.close(),
    );
    (this.el.querySelector('.search-close') as HTMLElement).addEventListener('click', () =>
      this.close(),
    );

    this.input.addEventListener('input', () => this.refresh());

    // 键盘流：全部拦在覆盖层内，不让漫游快捷键漏到全局
    this.el.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.isComposing) return; // 输入法候选阶段不抢按键
      if (e.key === 'Escape') {
        e.preventDefault();
        this.close();
      } else if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) {
        e.preventDefault();
        this.move(1);
      } else if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
        e.preventDefault();
        this.move(-1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        this.confirm();
      }
    });

    // 列表事件委托：悬停跟随、点击前往
    this.list.addEventListener('pointermove', (e) => {
      const item = (e.target as HTMLElement).closest('.search-item') as HTMLElement | null;
      if (!item) return;
      const i = Number(item.dataset.i);
      if (i !== this.active) {
        this.active = i;
        this.paintActive(false);
      }
    });
    this.list.addEventListener('pointerdown', (e) => e.preventDefault()); // 保住输入框焦点
    this.list.addEventListener('click', (e) => {
      const item = (e.target as HTMLElement).closest('.search-item') as HTMLElement | null;
      if (!item) return;
      this.active = Number(item.dataset.i);
      this.confirm();
    });
  }

  open() {
    if (this.isOpen) return;
    this.isOpen = true;
    window.clearTimeout(this.hideTimer);
    this.input.value = '';
    this.refresh();
    this.el.hidden = false;
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        this.el.classList.add('is-open');
        this.input.focus();
      }),
    );
    document.documentElement.classList.add('is-searching');
    this.handlers.onOpenChange(true);
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.el.classList.remove('is-open');
    this.input.blur();
    this.hideTimer = window.setTimeout(() => {
      this.el.hidden = true;
    }, 320);
    document.documentElement.classList.remove('is-searching');
    this.handlers.onOpenChange(false);
  }

  private move(dir: number) {
    if (!this.hits.length) return;
    this.active = Math.min(this.hits.length - 1, Math.max(0, this.active + dir));
    this.paintActive(true);
  }

  private confirm() {
    const post = this.hits[this.active];
    if (!post) return;
    this.close();
    this.handlers.onSelect(post);
  }

  private refresh() {
    const q = this.input.value.trim().toLowerCase();
    const terms = q ? q.split(/\s+/).filter(Boolean) : [];

    if (!terms.length) {
      this.hits = [...this.posts];
      this.count.textContent = `馆藏目录 · 共 ${this.posts.length} 件`;
    } else {
      const scored = this.posts
        .map((post) => ({ post, s: score(post, terms) }))
        .filter((h) => h.s >= 0)
        .sort((a, b) => b.s - a.s || a.post.index - b.post.index);
      this.hits = scored.map((h) => h.post);
      this.count.textContent = this.hits.length ? `找到 ${this.hits.length} 件藏品` : '';
    }

    this.active = 0;
    this.renderList(terms);
  }

  private renderList(terms: string[]) {
    if (!this.hits.length) {
      this.list.innerHTML = `<li class="search-empty">馆藏中没有与「${escapeHtml(
        this.input.value.trim(),
      )}」相关的作品</li>`;
      return;
    }
    this.list.innerHTML = this.hits
      .map((post, i) => {
        const snippet =
          (terms.length ? makeExcerpt(post.plain, terms) : null) ??
          highlight(post.summary, terms);
        return `
          <li class="search-item${i === this.active ? ' is-active' : ''}" data-i="${i}">
            <span class="search-item-no">No.${String(post.index + 1).padStart(2, '0')}</span>
            <span class="search-item-main">
              <span class="search-item-title">${highlight(post.title, terms)}</span>
              <span class="search-item-meta">${post.dateLabel} · 约 ${post.minutes} 分钟</span>
              <span class="search-item-snippet">${snippet}</span>
            </span>
            <span class="search-item-arrow">→</span>
          </li>`;
      })
      .join('');
  }

  private paintActive(scroll: boolean) {
    const items = this.list.querySelectorAll<HTMLElement>('.search-item');
    items.forEach((item, i) => item.classList.toggle('is-active', i === this.active));
    if (scroll) items[this.active]?.scrollIntoView({ block: 'nearest' });
  }
}
