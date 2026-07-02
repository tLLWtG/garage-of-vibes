const damp = (x: number, y: number, l: number, dt: number) =>
  x + (y - x) * (1 - Math.exp(-l * dt));

/** 画廊 HUD：品牌、操作提示、进度线、篇目计数、自绘光标。 */
export class Hud {
  private root: HTMLElement;
  private progressBar: HTMLElement;
  private counterCur: HTMLElement;
  private nowTitle: HTMLElement;
  private hint: HTMLElement;

  private ring: HTMLElement | null = null;
  private dot: HTMLElement | null = null;
  private mouse = { x: innerWidth / 2, y: innerHeight / 2 };
  private ringPos = { x: innerWidth / 2, y: innerHeight / 2 };
  private hovering = false;

  private lastIndex = -1;
  private hintDismissed = false;
  private finePointer = matchMedia('(pointer: fine)').matches;

  constructor(total: number, onSearch: () => void, onSeek?: (t: number) => void) {
    this.root = document.createElement('div');
    this.root.className = 'hud';
    this.root.innerHTML = `
      <header class="hud-top">
        <div class="brand">
          <span class="brand-en">NOCTURNE</span>
          <span class="brand-zh">夜 曲 画 廊</span>
        </div>
        <div class="hud-corner">
          <div class="hud-hint">
            <span>滚动或拖拽 · 漫游长廊</span>
            <span>点击画作 · 开始阅读</span>
          </div>
          <button class="hud-search" type="button" aria-label="检索馆藏">
            <span>检 索</span><kbd>/</kbd>
          </button>
        </div>
      </header>
      <footer class="hud-bottom">
        <div class="hud-now">
          <span class="hud-now-label">正在经过</span>
          <span class="hud-now-title"></span>
        </div>
        <div class="hud-counter">
          <span class="hud-counter-cur">01</span>
          <span class="hud-counter-sep">/</span>
          <span class="hud-counter-total">${String(total).padStart(2, '0')}</span>
        </div>
      </footer>
      <div class="hud-progress"><div class="hud-progress-bar"></div></div>
    `;
    document.body.appendChild(this.root);

    this.progressBar = this.root.querySelector('.hud-progress-bar') as HTMLElement;
    this.counterCur = this.root.querySelector('.hud-counter-cur') as HTMLElement;
    this.nowTitle = this.root.querySelector('.hud-now-title') as HTMLElement;
    this.hint = this.root.querySelector('.hud-hint') as HTMLElement;

    (this.root.querySelector('.hud-search') as HTMLElement).addEventListener('click', () =>
      onSearch(),
    );

    // 进度线即长廊地图：点在哪里，就滑到长廊的哪一段
    if (onSeek) {
      const track = this.root.querySelector('.hud-progress') as HTMLElement;
      track.classList.add('is-seekable');
      track.setAttribute('role', 'slider');
      track.setAttribute('aria-label', '长廊位置');
      track.addEventListener('click', (e) => {
        onSeek(e.clientX / window.innerWidth);
        this.dismissHint();
      });
    }

    if (this.finePointer) {
      this.dot = document.createElement('div');
      this.dot.className = 'cursor-dot';
      this.ring = document.createElement('div');
      this.ring.className = 'cursor-ring';
      this.ring.innerHTML = '<span>阅读</span>';
      document.body.appendChild(this.dot);
      document.body.appendChild(this.ring);
      window.addEventListener('pointermove', (e) => {
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
      });
      document.documentElement.classList.add('has-fine-pointer');
    }

    // 一段时间后自动收起提示
    setTimeout(() => this.dismissHint(), 9000);
  }

  dismissHint() {
    if (this.hintDismissed) return;
    this.hintDismissed = true;
    this.hint.classList.add('is-hidden');
  }

  setReading(on: boolean) {
    this.root.classList.toggle('is-reading', on);
    document.documentElement.classList.toggle('is-reading', on);
  }

  setHover(on: boolean) {
    this.hovering = on;
    this.ring?.classList.toggle('is-hover', on);
    document.body.style.cursor = on ? 'pointer' : '';
  }

  update(dt: number, progress: number, index: number, title: string) {
    this.progressBar.style.transform = `scaleX(${progress})`;
    if (index !== this.lastIndex) {
      this.lastIndex = index;
      this.counterCur.textContent = String(index + 1).padStart(2, '0');
      this.nowTitle.textContent = title;
      this.nowTitle.classList.remove('swap');
      void this.nowTitle.offsetWidth; // 重新触发动画
      this.nowTitle.classList.add('swap');
    }

    if (this.ring && this.dot) {
      this.ringPos.x = damp(this.ringPos.x, this.mouse.x, 14, dt);
      this.ringPos.y = damp(this.ringPos.y, this.mouse.y, 14, dt);
      const s = this.hovering ? 1 : 0.42;
      this.ring.style.transform = `translate(${this.ringPos.x}px, ${this.ringPos.y}px) translate(-50%, -50%) scale(${s})`;
      this.dot.style.transform = `translate(${this.mouse.x}px, ${this.mouse.y}px) translate(-50%, -50%)`;
    }
  }
}
