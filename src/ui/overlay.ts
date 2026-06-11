import type { Post } from '../content';

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
  private handlers: OverlayHandlers;
  private current: Post | null = null;

  constructor(handlers: OverlayHandlers) {
    this.handlers = handlers;
    this.el = document.createElement('div');
    this.el.className = 'overlay';
    this.el.hidden = true;
    this.el.innerHTML = `
      <div class="overlay-backdrop"></div>
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

    (this.el.querySelector('.overlay-close') as HTMLElement).addEventListener('click', () =>
      this.close(),
    );
    (this.el.querySelector('.overlay-backdrop') as HTMLElement).addEventListener('click', () =>
      this.close(),
    );
  }

  private render(post: Post, prev: Post | null, next: Post | null) {
    this.current = post;
    this.article.innerHTML = `
      <header class="post-head">
        <div class="post-kicker">
          <span>No.${String(post.index + 1).padStart(2, '0')}</span>
          <i></i>
          <span>${post.dateLabel}</span>
          <i></i>
          <span>约 ${post.minutes} 分钟</span>
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
  }

  open(post: Post, prev: Post | null, next: Post | null) {
    if (this.isOpen && this.current?.slug === post.slug) return;

    if (this.isOpen) {
      // 已打开：仅做内容交叉淡化
      this.article.classList.add('is-swapping');
      setTimeout(() => {
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
    this.el.classList.remove('is-open');
    // 立即通知：相机在覆盖层淡出的暗场中就开始缓慢转身，衔接更自然
    this.handlers.onClosed();
    setTimeout(() => {
      this.el.hidden = true;
    }, 420);
  }
}
