import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SoftBloomPass } from './bloom';

export interface Stage {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  composer: EffectComposer;
  bloom: SoftBloomPass;
  anisotropy: number;
  render(): void;
}

const BACKDROP = 0x050507;

export function createStage(container: HTMLElement): Stage {
  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    stencil: false,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.04;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BACKDROP);
  scene.fog = new THREE.Fog(BACKDROP, 9, 50);

  const camera = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    0.1,
    220,
  );
  camera.position.set(0, 1.74, 7);
  camera.lookAt(0, 1.66, 0);

  // 环境贴图：给金属画框与地板一点含蓄的反光质感
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.045).texture;
  scene.environmentIntensity = 0.2;
  pmrem.dispose();

  // 基底光：极低，只是不让暗部死黑
  scene.add(new THREE.AmbientLight(0xfff0df, 0.32));
  const hemi = new THREE.HemisphereLight(0x32312f, 0x060607, 0.5);
  scene.add(hemi);

  // 合成器：MSAA 渲染目标 + Bloom + 输出。
  // 注意：合成器统一用整数的“设备像素”工作（pixelRatio 固定为 1），
  // 否则在 Windows 125% 缩放等场景下会得到 1417.5 这类小数尺寸的渲染目标。
  const deviceSize = () => ({
    w: Math.floor(window.innerWidth * renderer.getPixelRatio()),
    h: Math.floor(window.innerHeight * renderer.getPixelRatio()),
  });

  const { w: dw, h: dh } = deviceSize();
  const target = new THREE.WebGLRenderTarget(dw, dh, {
    type: THREE.HalfFloatType,
    samples: 4,
  });
  const composer = new EffectComposer(renderer, target);
  composer.setPixelRatio(1);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new SoftBloomPass(dw, dh, 0.45, 1.0, 0.55);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  composer.setSize(dw, dh);

  function onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    const { w: pw, h: ph } = deviceSize();
    composer.setSize(pw, ph);
  }
  window.addEventListener('resize', onResize);

  return {
    renderer,
    scene,
    camera,
    composer,
    bloom,
    anisotropy: renderer.capabilities.getMaxAnisotropy(),
    render: () => composer.render(),
  };
}
