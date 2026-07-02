import './style.css';
// Cormorant 只用于 ASCII 的品牌字与编号，引 latin 子集即可；
// Noto Serif SC 必须保留全量 unicode-range 分片（正文任意汉字按需下载）
import '@fontsource/cormorant-garamond/latin-400.css';
import '@fontsource/cormorant-garamond/latin-500.css';
import '@fontsource/cormorant-garamond/latin-600.css';
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

const DEFAULT_TITLE = document.title;
const PROGRESS_KEY = 'nocturne:scroll';

/** 从 location.hash 解析深链接的文章 slug（#/p/<slug>） */
function slugFromHash(): string | null {
  const m = /^#\/p\/(.+)$/.exec(location.hash);
  return m ? decodeURIComponent(m[1]) : null;
}

/** 写入 / 清除深链接 hash（幂等；清除用 pushState 避免残留孤立的 #） */
function setHash(slug: string | null) {
  if (slug === slugFromHash()) return;
  if (slug) location.hash = `#/p/${encodeURIComponent(slug)}`;
  else history.pushState(null, '', location.pathname + location.search);
}

function setTitle(post: Post | null) {
  document.title = post ? `${post.title} · ${DEFAULT_TITLE}` : DEFAULT_TITLE;
}

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
  /** 当前正在（前往）阅读的文章 slug，深链接 hash 以它为准 */
  let readingSlug: string | null = null;

  const hud = new Hud(posts.length, () => search.open());

  /** 前往某篇文章：聚焦画作、写入深链接；阅读中则交叉换文 */
  function goTo(post: Post) {
    const entry = artworks[post.index];
    if (!entry) return;
    readingSlug = post.slug;
    setHash(post.slug);
    setTitle(post);
    if (overlay.isOpen) {
      rig.focus(entry);
      overlay.open(post, posts[post.index - 1] ?? null, posts[post.index + 1] ?? null);
    } else {
      hud.setReading(true);
      rig.focus(entry); // 文章由 onFocusArrived 打开
    }
  }

  /** 退出阅读态的公共收尾（清深链接、还原标题、相机返程） */
  function exitReading() {
    readingSlug = null;
    setHash(null);
    setTitle(null);
    hud.setReading(false);
    rig.blur();
  }

  const overlay = new Overlay({
    onClosed: () => exitReading(),
    onNavigate: (post) => goTo(post),
  });

  const rig = new CameraRig(stage.camera, stage.renderer.domElement, {
    maxScroll: corridor.maxScroll,
    count: posts.length,
    introLook: artworks[0]?.center,
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
    onSelect: (post) => goTo(post),
  });

  const picker = new Picker(stage.camera, stage.renderer.domElement, artworks, {
    isActive: () => rig.mode !== 'focus' && !overlay.isOpen && !search.isOpen,
    onHover: (entry) => hud.setHover(entry !== null),
    onPick: (entry) => {
      hud.setHover(false);
      goTo(entry.post);
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
      else if (overlay.isOpen) overlay.close(); // onClosed 里统一收尾
      else if (rig.mode === 'focus') exitReading();
    }
    if (e.key === 'Enter' && rig.mode === 'roam' && !overlay.isOpen && !search.isOpen) {
      const entry = artworks[rig.nearestIndex];
      if (entry) goTo(entry.post);
    }
  });

  // ------------------------------------------------------------ 深链接与进度
  // 浏览器前进 / 后退：hash 有 slug 则前往，变空则退出阅读
  window.addEventListener('hashchange', () => {
    const slug = slugFromHash();
    if (slug) {
      if (slug === readingSlug) return;
      const post = posts.find((p) => p.slug === slug);
      if (post) goTo(post);
    } else if (readingSlug) {
      if (overlay.isOpen) overlay.close();
      else exitReading();
    }
  });

  // 离开时记住走到哪，重访从原地继续
  const saveProgress = () => {
    try {
      localStorage.setItem(PROGRESS_KEY, String(rig.scrollValue));
    } catch {
      /* 隐私模式下 localStorage 不可用，安静跳过 */
    }
  };
  window.addEventListener('pagehide', saveProgress);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveProgress();
  });

  const initialPost = (() => {
    const slug = slugFromHash();
    return slug ? posts.find((p) => p.slug === slug) : undefined;
  })();
  if (initialPost) {
    // 深链接进馆：定位到画作稍后方，再走完整的聚焦动画
    rig.restore(-artworks[initialPost.index].z);
    goTo(initialPost);
  } else {
    let saved = NaN;
    try {
      saved = parseFloat(localStorage.getItem(PROGRESS_KEY) ?? '');
    } catch {
      /* ignore */
    }
    if (Number.isFinite(saved) && saved > 0.5) rig.restore(saved);
  }

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
