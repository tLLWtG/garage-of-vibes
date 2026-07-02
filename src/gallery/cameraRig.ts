import * as THREE from 'three';
import { CORRIDOR } from './corridor';
import type { ArtworkEntry } from './artwork';

export type RigMode = 'intro' | 'roam' | 'focus';

export interface RigOptions {
  maxScroll: number;
  /** 画作总数（不要从 maxScroll 反推：单篇时会推错） */
  count: number;
  /** 开场瞥视的落点（第一幅画的中心）；省略则直接看向走廊中线 */
  introLook?: THREE.Vector3;
  onFocusArrived(entry: ArtworkEntry): void;
  onWake?(): void;
}

const EYE = 1.7;

const damp = THREE.MathUtils.damp;
const clamp = THREE.MathUtils.clamp;

/**
 * 相机系统：长廊阻尼漫游（滚轮 / 拖拽 / 键盘）+ 鼠标视差 + 点击聚焦。
 */
export class CameraRig {
  mode: RigMode = 'intro';
  inputEnabled = true;

  private camera: THREE.PerspectiveCamera;
  private opts: RigOptions;

  private scroll = 0;
  private scrollTarget = 0;

  private pointer = new THREE.Vector2(); // ndc
  private pointerSmooth = new THREE.Vector2();

  private pos = new THREE.Vector3();
  private look = new THREE.Vector3(0, EYE - 0.06, -6);
  private desiredPos = new THREE.Vector3();
  private desiredLook = new THREE.Vector3();

  private dragging = false;
  private lastDrag = { x: 0, y: 0 };
  private keys = new Set<string>();

  private focusEntry: ArtworkEntry | null = null;
  private focusPos = new THREE.Vector3();
  private focusTimer = 0;
  private focusFired = false;

  private introTimer = 0;
  private glance = true;
  private reducedMotion = false;

  // 阻尼系数本身也做平滑：blur() 把它压低，update 中渐渐恢复，返程才不会瞬间全速甩动
  private posLambdaCur = 1.5;
  private lookLambdaCur = 6.5;

  constructor(camera: THREE.PerspectiveCamera, dom: HTMLElement, opts: RigOptions) {
    this.camera = camera;
    this.opts = opts;
    this.pos.copy(camera.position);
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    dom.style.touchAction = 'none';

    window.addEventListener('wheel', (e) => this.onWheel(e), { passive: true });
    dom.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    window.addEventListener('pointermove', (e) => this.onPointerMove(e));
    window.addEventListener('pointerup', () => (this.dragging = false));
    window.addEventListener('pointercancel', () => (this.dragging = false));
    window.addEventListener('keydown', (e) => this.onKey(e, true));
    window.addEventListener('keyup', (e) => this.onKey(e, false));
  }

  // ------------------------------------------------------------- 输入

  private wake() {
    if (this.mode === 'intro') this.mode = 'roam';
    this.opts.onWake?.();
  }

  private onWheel(e: WheelEvent) {
    if (!this.inputEnabled || this.mode === 'focus') return;
    this.wake();
    const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    this.scrollTarget = clamp(this.scrollTarget + dy * 0.0125, 0, this.opts.maxScroll);
  }

  private onPointerDown(e: PointerEvent) {
    if (!this.inputEnabled || this.mode === 'focus') return;
    this.dragging = true;
    this.lastDrag.x = e.clientX;
    this.lastDrag.y = e.clientY;
  }

  private onPointerMove(e: PointerEvent) {
    if (this.dragging && this.inputEnabled && this.mode !== 'focus') {
      const dx = e.clientX - this.lastDrag.x;
      const dy = e.clientY - this.lastDrag.y;
      this.lastDrag.x = e.clientX;
      this.lastDrag.y = e.clientY;
      const k = 15 / window.innerHeight;
      this.scrollTarget = clamp(
        this.scrollTarget - (dy * 1.6 + dx * 0.35) * k,
        0,
        this.opts.maxScroll,
      );
      if (Math.abs(dy) + Math.abs(dx) > 2) this.wake();
      return; // 拖拽时冻结视差，避免双重晃动
    }
    this.pointer.set(
      (e.clientX / window.innerWidth) * 2 - 1,
      -((e.clientY / window.innerHeight) * 2 - 1),
    );
  }

  private onKey(e: KeyboardEvent, down: boolean) {
    const code = e.code;
    // 松键永远生效：检索打开（inputEnabled=false）期间松开的键不能残留在 keys 里
    if (!down) {
      this.keys.delete(code);
      return;
    }
    if (!this.inputEnabled || this.mode === 'focus') return;
    if (code === 'PageDown') {
      this.snapBy(1);
      return;
    }
    if (code === 'PageUp') {
      this.snapBy(-1);
      return;
    }
    this.keys.add(code);
  }

  private snapBy(step: number) {
    this.wake();
    // 基于“目标位置”而非当前阻尼位置推算，连按时才能逐张累进
    const targetIdx = Math.round((this.scrollTarget - CORRIDOR.firstOffset) / CORRIDOR.spacing);
    const idx = clamp(targetIdx + step, 0, this.opts.count - 1);
    this.scrollTarget = CORRIDOR.firstOffset + idx * CORRIDOR.spacing;
  }

  // ------------------------------------------------------------- 状态

  get progress(): number {
    return this.opts.maxScroll > 0 ? this.scroll / this.opts.maxScroll : 0;
  }

  /** 当前沿长廊走过的距离（米），供进度记忆持久化 */
  get scrollValue(): number {
    return this.scroll;
  }

  get nearestIndex(): number {
    return clamp(
      Math.round((this.scroll - CORRIDOR.firstOffset) / CORRIDOR.spacing),
      0,
      this.opts.count - 1,
    );
  }

  focus(entry: ArtworkEntry) {
    this.mode = 'focus';
    this.focusEntry = entry;
    this.focusTimer = 0;
    this.focusFired = false;

    const fovV = THREE.MathUtils.degToRad(this.camera.fov) * 0.5;
    const dH = (entry.size.h * 0.5 * 1.62) / Math.tan(fovV);
    const fovH = Math.atan(Math.tan(fovV) * this.camera.aspect);
    const dW = (entry.size.w * 0.5 * 1.7) / Math.tan(fovH);
    const d = clamp(Math.max(dH, dW), 1.5, CORRIDOR.width - 1.1);
    this.focusPos.copy(entry.center).addScaledVector(entry.normal, d);
    // 聚焦手感保持原样：直接以聚焦阻尼起步
    this.posLambdaCur = 3.2;
    this.lookLambdaCur = 3.6;
  }

  /** 恢复上次离开时的位置：从恢复点后方轻推入场，跳过开场瞥视 */
  restore(scroll: number) {
    const s = clamp(scroll, 0, this.opts.maxScroll);
    this.glance = false;
    this.scroll = this.scrollTarget = s;
    this.pos.set(0, EYE + 0.04, -s + 2.2);
    this.look.set(0, EYE - 0.05, -s - 7);
    this.camera.position.copy(this.pos);
    this.camera.lookAt(this.look);
  }

  blur() {
    if (this.focusEntry) {
      this.scroll = this.scrollTarget = -this.focusEntry.z;
    }
    this.focusEntry = null;
    this.mode = 'roam';
    // 返程慢起步：压低响应，让相机从画前优雅地转回长廊，再渐渐恢复漫游全速
    this.posLambdaCur = 1.25;
    this.lookLambdaCur = 1.45;
  }

  // ------------------------------------------------------------- 帧更新

  update(dt: number) {
    const px = this.reducedMotion ? 0 : this.pointerSmooth.x;
    const py = this.reducedMotion ? 0 : this.pointerSmooth.y;
    this.pointerSmooth.x = damp(this.pointerSmooth.x, this.pointer.x, 5, dt);
    this.pointerSmooth.y = damp(this.pointerSmooth.y, this.pointer.y, 5, dt);

    if (this.mode !== 'focus') {
      // 键盘连续移动
      let dir = 0;
      if (this.keys.has('ArrowUp') || this.keys.has('KeyW')) dir -= 1;
      if (this.keys.has('ArrowDown') || this.keys.has('KeyS')) dir += 1;
      if (dir !== 0) {
        this.wake();
        this.scrollTarget = clamp(this.scrollTarget - dir * 5.5 * dt, 0, this.opts.maxScroll);
      }

      this.scroll = damp(this.scroll, this.scrollTarget, 4.2, dt);
      const z = -this.scroll;
      this.desiredPos.set(px * 0.55, EYE + py * 0.16, z);
      this.desiredLook.set(px * 1.7, EYE - 0.05 + py * 0.6, z - 7);
    } else if (this.focusEntry) {
      this.focusTimer += dt;
      this.desiredPos.copy(this.focusPos);
      this.desiredPos.x += px * 0.07;
      this.desiredPos.y += py * 0.05;
      this.desiredLook.copy(this.focusEntry.center);
      if (!this.focusFired && this.focusTimer > 0.9) {
        this.focusFired = true;
        this.opts.onFocusArrived(this.focusEntry);
      }
    }

    if (this.mode === 'intro') {
      this.introTimer += dt;
      // 开场先把视线落在入口第一幅画上，再缓缓归正走廊中线。
      // 窗口刻意压后：渲染循环在加载屏后面就已启动，瞥视要等揭幕后才被看见
      if (this.glance && this.opts.introLook && !this.reducedMotion) {
        const w = 1 - THREE.MathUtils.smoothstep(this.introTimer, 2.3, 3.9);
        if (w > 0) this.desiredLook.lerp(this.opts.introLook, w);
      }
      if (this.introTimer > 4.2) this.mode = 'roam';
    }

    const posLambda = this.mode === 'intro' ? 1.5 : this.mode === 'focus' ? 3.2 : 5.5;
    const lookLambda = this.mode === 'focus' ? 3.6 : 6.5;
    this.posLambdaCur = damp(this.posLambdaCur, posLambda, 1.1, dt);
    this.lookLambdaCur = damp(this.lookLambdaCur, lookLambda, 1.1, dt);
    const kp = 1 - Math.exp(-this.posLambdaCur * dt);
    const kl = 1 - Math.exp(-this.lookLambdaCur * dt);
    this.pos.lerp(this.desiredPos, kp);
    this.look.lerp(this.desiredLook, kl);
    this.camera.position.copy(this.pos);
    this.camera.lookAt(this.look);
  }
}
