import * as THREE from 'three';
import type { ArtworkEntry } from './artwork';

export interface PickerHandlers {
  isActive(): boolean;
  onHover(entry: ArtworkEntry | null): void;
  onPick(entry: ArtworkEntry): void;
}

/** 画作的悬停与点击拾取（区分拖拽与点按）。 */
export class Picker {
  private raycaster = new THREE.Raycaster();
  private ndc = new THREE.Vector2(2, 2); // 初始在屏幕外
  private camera: THREE.PerspectiveCamera;
  private hitMeshes: THREE.Mesh[];
  private handlers: PickerHandlers;
  private hovered: ArtworkEntry | null = null;

  private down: { x: number; y: number; t: number } | null = null;
  private moved = false;

  constructor(
    camera: THREE.PerspectiveCamera,
    dom: HTMLElement,
    entries: ArtworkEntry[],
    handlers: PickerHandlers,
  ) {
    this.camera = camera;
    this.hitMeshes = entries.map((e) => e.hitMesh);
    this.handlers = handlers;

    window.addEventListener('pointermove', (e) => {
      this.ndc.set(
        (e.clientX / window.innerWidth) * 2 - 1,
        -((e.clientY / window.innerHeight) * 2 - 1),
      );
      if (this.down) {
        const dx = e.clientX - this.down.x;
        const dy = e.clientY - this.down.y;
        if (Math.hypot(dx, dy) > 9) this.moved = true;
      }
    });

    dom.addEventListener('pointerdown', (e) => {
      this.down = { x: e.clientX, y: e.clientY, t: performance.now() };
      this.moved = false;
      // 触屏没有 hover：按下时立即更新一次 ndc 与拾取
      this.ndc.set(
        (e.clientX / window.innerWidth) * 2 - 1,
        -((e.clientY / window.innerHeight) * 2 - 1),
      );
      this.cast();
    });

    dom.addEventListener('pointerup', () => {
      const wasTap =
        this.down && !this.moved && performance.now() - this.down.t < 650;
      this.down = null;
      if (wasTap && this.hovered && this.handlers.isActive()) {
        this.handlers.onPick(this.hovered);
      }
    });
  }

  private cast() {
    if (!this.handlers.isActive()) {
      this.setHovered(null);
      return;
    }
    this.raycaster.setFromCamera(this.ndc, this.camera);
    const hits = this.raycaster.intersectObjects(this.hitMeshes, false);
    const hit =
      hits.length > 0 && hits[0].distance < 14
        ? (hits[0].object.userData.entry as ArtworkEntry)
        : null;
    this.setHovered(hit);
  }

  private setHovered(entry: ArtworkEntry | null) {
    if (entry === this.hovered) return;
    this.hovered = entry;
    this.handlers.onHover(entry);
  }

  update() {
    this.cast();
  }
}
