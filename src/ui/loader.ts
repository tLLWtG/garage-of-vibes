const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** 加载屏：进度发丝线 + 状态文字，完成后整体淡出。 */
export class Loader {
  private el = document.getElementById('loader')!;
  private bar = this.el.querySelector('.loader-bar') as HTMLElement;
  private status = this.el.querySelector('.loader-status') as HTMLElement;
  private born = performance.now();

  set(progress: number, label?: string) {
    this.bar.style.transform = `scaleX(${Math.min(1, Math.max(0, progress))})`;
    if (label) this.status.textContent = label;
  }

  async done() {
    this.set(1, '开门 · 请进');
    const elapsed = performance.now() - this.born;
    await sleep(Math.max(0, 1250 - elapsed) + 400);
    this.el.classList.add('is-done');
    await sleep(980);
    this.el.remove();
  }
}
