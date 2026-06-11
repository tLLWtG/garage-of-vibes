import './style.css';
import '@fontsource/cormorant-garamond/400.css';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/noto-serif-sc/500.css';
import '@fontsource/noto-serif-sc/700.css';

import * as THREE from 'three';
import { loadPosts, type Post } from './content';
import { createStage } from './gallery/scene';
import { buildCorridor } from './gallery/corridor';
import { buildArtwork, type ArtworkEntry } from './gallery/artwork';
import { CameraRig } from './gallery/cameraRig';
import { Picker } from './gallery/picking';
import { Loader } from './ui/loader';
import { Hud } from './ui/hud';
import { Overlay } from './ui/overlay';
import { SearchOverlay } from './ui/search';

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

async function loadFonts(posts: Post[]) {
  const zhSample = posts.map((p) => p.title).join('') + '夜曲画廊年月日约分钟正在经过阅读关闭';
  const latinSample = 'NOCTURNE0123456789No.· AWALKBEST';
  await Promise.race([
    Promise.allSettled([
      document.fonts.load('500 38px "Cormorant Garamond"', latinSample),
      document.fonts.load('600 38px "Cormorant Garamond"', latinSample),
      document.fonts.load('500 40px "Noto Serif SC"', zhSample),
      document.fonts.load('700 40px "Noto Serif SC"', zhSample),
    ]),
    new Promise((r) => setTimeout(r, 3500)),
  ]);
}

async function boot() {
  const loader = new Loader();

  loader.set(0.06, '整理文稿…');
  const posts = loadPosts();

  loader.set(0.16, '唤醒字体…');
  await loadFonts(posts);

  loader.set(0.3, '搭建长廊…');
  const stage = createStage(document.getElementById('app')!);
  const corridor = buildCorridor(stage.scene, posts.length);

  const artworks: ArtworkEntry[] = [];
  for (let i = 0; i < posts.length; i++) {
    loader.set(0.3 + (0.62 * (i + 1)) / posts.length, `布展 ${i + 1} / ${posts.length}…`);
    artworks.push(buildArtwork(posts[i], stage.scene, stage.anisotropy));
    await nextFrame();
  }

  loader.set(0.96, '点亮射灯…');

  // ------------------------------------------------------------ UI 与交互
  const hud = new Hud(posts.length, () => search.open());

  const overlay = new Overlay({
    onClosed: () => {
      hud.setReading(false);
      rig.blur();
    },
    onNavigate: (post) => {
      const entry = artworks[post.index];
      rig.focus(entry);
      overlay.open(post, posts[post.index - 1] ?? null, posts[post.index + 1] ?? null);
    },
  });

  const rig = new CameraRig(stage.camera, stage.renderer.domElement, {
    maxScroll: corridor.maxScroll,
    onWake: () => hud.dismissHint(),
    onFocusArrived: (entry) => {
      if (overlay.isOpen) return;
      const i = entry.post.index;
      overlay.open(entry.post, posts[i - 1] ?? null, posts[i + 1] ?? null);
      hud.setReading(true);
    },
  });

  const search = new SearchOverlay(posts, {
    onOpenChange: (open) => {
      rig.inputEnabled = !open;
    },
    onSelect: (post) => {
      const entry = artworks[post.index];
      if (!entry) return;
      if (overlay.isOpen) {
        // 阅读中检索：滑向新画作并交叉换文
        rig.focus(entry);
        overlay.open(post, posts[post.index - 1] ?? null, posts[post.index + 1] ?? null);
      } else {
        hud.setReading(true);
        rig.focus(entry);
      }
    },
  });

  const picker = new Picker(stage.camera, stage.renderer.domElement, artworks, {
    isActive: () => rig.mode !== 'focus' && !overlay.isOpen && !search.isOpen,
    onHover: (entry) => hud.setHover(entry !== null),
    onPick: (entry) => {
      hud.setHover(false);
      hud.setReading(true);
      rig.focus(entry);
    },
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === '/' && !search.isOpen) {
      e.preventDefault();
      search.open();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (!search.isOpen) search.open();
      return;
    }
    if (e.key === 'Escape') {
      if (search.isOpen) search.close();
      else if (overlay.isOpen) overlay.close();
      else if (rig.mode === 'focus') {
        hud.setReading(false);
        rig.blur();
      }
    }
    if (e.key === 'Enter' && rig.mode === 'roam' && !overlay.isOpen && !search.isOpen) {
      const entry = artworks[rig.nearestIndex];
      if (entry) {
        hud.setReading(true);
        rig.focus(entry);
      }
    }
  });

  // ------------------------------------------------------------ 渲染循环
  const clock = new THREE.Clock();
  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    rig.update(dt);
    picker.update();
    corridor.update(clock.elapsedTime);
    const idx = rig.nearestIndex;
    hud.update(dt, rig.progress, idx, posts[idx]?.title ?? '');
    stage.render();
    requestAnimationFrame(frame);
  }
  frame();

  await loader.done();
}

boot().catch((err) => {
  console.error(err);
  const fallback = document.createElement('div');
  fallback.style.cssText =
    'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;' +
    'background:#070709;color:#e8e2d4;font:14px/1.9 sans-serif;z-index:100;text-align:center;padding:24px;';
  fallback.innerHTML = '这座画廊未能开门——可能是浏览器不支持 WebGL2。<br/>请换一个现代浏览器再来。';
  document.body.appendChild(fallback);
});
