import type { Post } from '../content';

/** 复制文本：clipboard API 优先，被权限/焦点策略拒绝时退回 execCommand */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    ta.remove();
    return ok;
  }
}

export interface OverlayHandlers {
  /** 用户主动关闭（ESC / 按钮 / 点背景）后触发 */
  onClosed(): void;
  /** 在覆盖层内切换文章 */
  onNavigate(post: Post): void;
}

/** 文章阅读层：深色毛玻璃 + 居中窄栏排版。 */
export class Overlay {
  isOpen = false;

  private el: HTMLElement;
  private scrollBox: HTMLElement;
  private article: HTMLElement;
  private progressBar: HTMLElement;
  private handlers: OverlayHandlers;
  private current: Post | null = null;
  private prev: Post | null = null;
  private next: Post | null = null;
  private swapTimer: number | undefined;

  constructor(handlers: OverlayHandlers) {
    this.handlers = handlers;
    this.el = document.createElement('div');
    this.el.className = 'overlay';
    this.el.hidden = true;
    this.el.innerHTML = `
      <div class="overlay-backdrop"></div>
      <div class="overlay-progress"><div class="overlay-progress-bar"></div></div>
      <div class="overlay-scroll">
        <article class="overlay-article"></article>
      </div>
      <button class="overlay-close" aria-label="关闭文章">
        <span class="overlay-close-x">✕</span><span>关闭</span><kbd>ESC</kbd>
      </button>
    `;
    document.body.appendChild(this.el);

    this.scrollBox = this.el.querySelector('.overlay-scroll') as HTMLElement;
    this.article = this.el.querySelector('.overlay-article') as HTMLElement;
    this.progressBar = this.el.querySelector('.overlay-progress-bar') as HTMLElement;

    (this.el.querySelector('.overlay-close') as HTMLElement).addEventListener('click', () =>
      this.close(),
    );
    (this.el.querySelector('.overlay-backdrop') as HTMLElement).addEventListener('click', () =>
      this.close(),
    );

    // 顶部细线随正文滚动生长，给长文一个安静的读到哪里的度量
    this.scrollBox.addEventListener('scroll', () => this.paintProgress(), { passive: true });

    // 阅读中 ← → 翻到上一幅 / 下一幅
    window.addEventListener('keydown', (e) => {
      if (!this.isOpen) return;
      if (e.key === 'ArrowLeft' && this.prev) this.handlers.onNavigate(this.prev);
      else if (e.key === 'ArrowRight' && this.next) this.handlers.onNavigate(this.next);
    });
  }

  private paintProgress() {
    const max = this.scrollBox.scrollHeight - this.scrollBox.clientHeight;
    const p = max > 0 ? this.scrollBox.scrollTop / max : 0;
    this.progressBar.style.transform = `scaleX(${p})`;
  }

  private render(post: Post, prev: Post | null, next: Post | null) {
    this.current = post;
    this.prev = prev;
    this.next = next;
    this.article.innerHTML = `
      <header class="post-head">
        <div class="post-kicker">
          <span>No.${String(post.index + 1).padStart(2, '0')}</span>
          <i></i>
          <span>${post.dateLabel}</span>
          <i></i>
          <span>约 ${post.minutes} 分钟</span>
          <button class="post-share" type="button" aria-label="复制文章链接">复制链接</button>
        </div>
        <h1 class="post-title">${post.title}</h1>
        <p class="post-summary">${post.summary}</p>
      </header>
      <div class="post-body">${post.html}</div>
      <nav class="post-nav">
        <button class="post-nav-btn prev" ${prev ? '' : 'disabled'}>
          <span class="nav-label">← 上一幅</span>
          <span class="nav-title">${prev ? prev.title : '已在入口'}</span>
        </button>
        <button class="post-nav-btn next" ${next ? '' : 'disabled'}>
          <span class="nav-label">下一幅 →</span>
          <span class="nav-title">${next ? next.title : '已到尽头'}</span>
        </button>
      </nav>
      <footer class="post-foot">NOCTURNE · 夜曲画廊</footer>
    `;
    if (prev) {
      (this.article.querySelector('.post-nav-btn.prev') as HTMLElement).addEventListener(
        'click',
        () => this.handlers.onNavigate(prev),
      );
    }
    if (next) {
      (this.article.querySelector('.post-nav-btn.next') as HTMLElement).addEventListener(
        'click',
        () => this.handlers.onNavigate(next),
      );
    }

    // 复制深链接：轻量的分享方式，比弹分享面板更符合这里的气质
    const share = this.article.querySelector('.post-share') as HTMLButtonElement;
    share.addEventListener('click', async () => {
      const url = `${location.origin}${location.pathname}#/p/${encodeURIComponent(post.slug)}`;
      const ok = await copyText(url);
      share.textContent = ok ? '已复制' : '复制失败';
      if (ok) share.classList.add('is-done');
      setTimeout(() => {
        share.textContent = '复制链接';
        share.classList.remove('is-done');
      }, 1600);
    });

    // 每个代码块右上角挂一个复制按钮。
    // pre 自身是横向滚动容器，按钮须挂在外层 wrapper 上才能钉住不随内容滚走
    this.article.querySelectorAll<HTMLElement>('.post-body pre').forEach((pre) => {
      const wrap = document.createElement('div');
      wrap.className = 'code-block';
      pre.parentNode!.insertBefore(wrap, pre);
      wrap.appendChild(pre);

      const btn = document.createElement('button');
      btn.className = 'code-copy';
      btn.type = 'button';
      btn.textContent = '复制';
      btn.addEventListener('click', async () => {
        const ok = await copyText(pre.querySelector('code')?.textContent ?? '');
        btn.textContent = ok ? '已复制' : '失败';
        if (ok) btn.classList.add('is-done');
        setTimeout(() => {
          btn.textContent = '复制';
          btn.classList.remove('is-done');
        }, 1600);
      });
      wrap.appendChild(btn);
    });

    this.paintProgress();
  }

  open(post: Post, prev: Post | null, next: Post | null) {
    if (this.isOpen && this.current?.slug === post.slug) return;

    if (this.isOpen) {
      // 已打开：仅做内容交叉淡化。连续快速切换时只保留最后一次
      window.clearTimeout(this.swapTimer);
      this.article.classList.add('is-swapping');
      this.swapTimer = window.setTimeout(() => {
        this.render(post, prev, next);
        this.scrollBox.scrollTop = 0;
        this.article.classList.remove('is-swapping');
      }, 240);
      return;
    }

    this.render(post, prev, next);
    this.scrollBox.scrollTop = 0;
    this.el.hidden = false;
    this.isOpen = true;
    requestAnimationFrame(() => requestAnimationFrame(() => this.el.classList.add('is-open')));
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    window.clearTimeout(this.swapTimer);
    this.article.classList.remove('is-swapping');
    this.el.classList.remove('is-open');
    // 立即通知：相机在覆盖层淡出的暗场中就开始缓慢转身，衔接更自然
    this.handlers.onClosed();
    setTimeout(() => {
      this.el.hidden = true;
    }, 420);
  }
}
