import * as THREE from 'three';
import type { Post } from '../content';
import { makeCoverTexture, makePlaqueTexture, seededRandom } from '../covers';
import { CORRIDOR } from './corridor';

export interface ArtworkEntry {
  post: Post;
  group: THREE.Group;
  hitMesh: THREE.Mesh;
  /** 画面中心（世界坐标） */
  center: THREE.Vector3;
  /** 朝向走廊内侧的法线 */
  normal: THREE.Vector3;
  size: { w: number; h: number };
  z: number;
}

// 共享材质
const frameMat = new THREE.MeshStandardMaterial({
  color: 0x1c1c1f,
  metalness: 0.72,
  roughness: 0.32,
});
const matBoardMat = new THREE.MeshStandardMaterial({ color: 0xe6dfd0, roughness: 0.9 });
const fixtureMat = new THREE.MeshStandardMaterial({
  color: 0x111113,
  metalness: 0.6,
  roughness: 0.4,
  // 微弱暖辉：模拟灯口溢光照亮灯壳，让黑灯具从黑天花中浮出
  emissive: 0x1a140c,
});
const lampMat = new THREE.MeshBasicMaterial({
  color: new THREE.Color(0xfff0d8).multiplyScalar(2.0),
});
const hitMat = new THREE.MeshBasicMaterial({
  transparent: true,
  opacity: 0,
  depthWrite: false,
  colorWrite: false,
  side: THREE.DoubleSide,
});

/**
 * 成像射灯的光形贴图（framing projector）：
 * 把画框四角投影到射灯视锥的贴图平面上，画出羽化四边形——
 * 光斑形状与画框精确对位，四角均匀受光，框外几乎零溢光。
 */
function makeSpotMask(
  corners: THREE.Vector3[],
  fixture: THREE.Vector3,
  target: THREE.Vector3,
  halfAngle: number,
): THREE.CanvasTexture {
  const cam = new THREE.PerspectiveCamera(THREE.MathUtils.radToDeg(halfAngle * 2), 1, 0.1, 12);
  cam.position.copy(fixture);
  cam.lookAt(target);
  cam.updateMatrixWorld(true);

  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, size, size);

  const pts = corners.map((p) => {
    const v = p.clone().project(cam);
    return { x: (v.x * 0.5 + 0.5) * size, y: (1 - (v.y * 0.5 + 0.5)) * size };
  });
  ctx.filter = 'blur(8px)';
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  ctx.filter = 'none';

  return new THREE.CanvasTexture(c);
}

// 灯锥体：两端渐隐、中段最亮的隐约光束（顶端融进灯口，底端融进画面）
const coneMat = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  uniforms: {
    uColor: { value: new THREE.Color(0xffe9d0) },
    uOpacity: { value: 0.06 },
  },
  vertexShader: /* glsl */ `
    varying float vT;
    void main() {
      vT = uv.y; // 1 = 灯头处
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    varying float vT;
    uniform vec3 uColor;
    uniform float uOpacity;
    void main() {
      // clamp 防止插值产生的微小负值进入 pow 而得到 NaN
      float t = clamp(vT, 0.0, 1.0);
      float a = pow(t, 1.8) * smoothstep(1.0, 0.78, t) * uOpacity;
      gl_FragColor = vec4(uColor, a);
    }
  `,
});

export function buildArtwork(post: Post, scene: THREE.Scene, anisotropy: number): ArtworkEntry {
  const rand = seededRandom(post.slug + ':size');
  const side: 1 | -1 = post.index % 2 === 0 ? -1 : 1; // 最新一篇挂左墙
  const z = -(CORRIDOR.firstOffset + post.index * CORRIDOR.spacing);
  const w = 1.5 + rand() * 0.45;
  const h = w * (1.2 + rand() * 0.12);
  const cy = 1.78; // 画面中心高度

  const group = new THREE.Group();
  group.position.set((side * CORRIDOR.width) / 2, 0, z);
  group.rotation.y = (-side * Math.PI) / 2; // 朝向走廊内侧（局部 +z 即法线方向）

  // ------------------------------------------------ 画框 / 卡纸 / 画面
  const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.16, h + 0.16, 0.07), frameMat);
  frame.position.set(0, cy, 0.035);
  group.add(frame);

  const matBoard = new THREE.Mesh(new THREE.PlaneGeometry(w, h), matBoardMat);
  matBoard.position.set(0, cy, 0.073);
  group.add(matBoard);

  const coverTex = makeCoverTexture(post.slug, post.variant);
  coverTex.anisotropy = anisotropy;
  const cover = new THREE.Mesh(
    new THREE.PlaneGeometry(w * 0.78, h * 0.78),
    new THREE.MeshStandardMaterial({
      map: coverTex,
      emissive: 0xffffff,
      emissiveMap: coverTex,
      emissiveIntensity: 0.34,
      roughness: 0.86,
      metalness: 0,
    }),
  );
  cover.position.set(0, cy, 0.078);
  group.add(cover);

  // ------------------------------------------------ 展签
  const plaqueTex = makePlaqueTexture(post);
  plaqueTex.anisotropy = anisotropy;
  const plaque = new THREE.Mesh(
    new THREE.PlaneGeometry(0.52, 0.2925),
    new THREE.MeshStandardMaterial({
      map: plaqueTex,
      emissive: 0xffffff,
      emissiveMap: plaqueTex,
      emissiveIntensity: 0.34,
      roughness: 0.9,
    }),
  );
  plaque.position.set(w / 2 + 0.46, 1.5, 0.012);
  group.add(plaque);

  // ------------------------------------------------ 射灯（吊杆 + 灯具 + 光锥 + 真实光源）
  const fixturePos = new THREE.Vector3(0, CORRIDOR.height - 0.3, 1.55);
  const targetPos = new THREE.Vector3(0, cy - 0.02, 0.06);
  const dir = targetPos.clone().sub(fixturePos).normalize();
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);

  // 吊杆与天花底座：让射灯有可读的结构，而不是悬空的光源
  const stemLen = 0.24;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, stemLen, 10), fixtureMat);
  stem.position.set(0, CORRIDOR.height - stemLen / 2, fixturePos.z);
  group.add(stem);

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.018, 16), fixtureMat);
  base.position.set(0, CORRIDOR.height - 0.009, fixturePos.z);
  group.add(base);

  const fixture = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.062, 0.17, 20), fixtureMat);
  fixture.position.copy(fixturePos);
  fixture.quaternion.copy(quat);
  group.add(fixture);

  const lampCap = new THREE.Mesh(new THREE.CircleGeometry(0.04, 20), lampMat);
  lampCap.rotation.x = Math.PI / 2; // 朝向圆柱的 -y 端
  lampCap.position.set(0, -0.086, 0);
  fixture.add(lampCap);

  const coneLen = fixturePos.distanceTo(targetPos) * 0.96;
  const coneGeo = new THREE.ConeGeometry(w * 0.45, coneLen, 26, 1, true);
  coneGeo.translate(0, -coneLen / 2, 0); // 顶点移到原点，向 -y 展开
  const cone = new THREE.Mesh(coneGeo, coneMat);
  cone.position.copy(fixturePos);
  cone.quaternion.copy(quat);
  group.add(cone);

  // 成像射灯：光形贴图与画框精确对位（角度只需包住贴图视锥，形状交给 map）
  const spotFov = 0.7;
  const bleed = 0.1; // 光形超出画框的出血量
  const hw = (w + 0.16) / 2 + bleed;
  const top = cy + (h + 0.16) / 2 + bleed;
  const bottom = cy - (h + 0.16) / 2 - bleed;
  const spotMask = makeSpotMask(
    [
      new THREE.Vector3(-hw, top, 0.06),
      new THREE.Vector3(hw, top, 0.06),
      new THREE.Vector3(hw, bottom, 0.06),
      new THREE.Vector3(-hw, bottom, 0.06),
    ],
    fixturePos,
    targetPos,
    spotFov,
  );
  const spot = new THREE.SpotLight(0xffe8cb, 30, 0, spotFov, 0, 2);
  spot.map = spotMask;
  spot.position.copy(fixturePos);
  spot.target.position.copy(targetPos);
  group.add(spot);
  group.add(spot.target);

  scene.add(group);
  group.updateMatrixWorld(true);

  // ------------------------------------------------ 拾取区域（覆盖画框与展签）
  const hitMesh = new THREE.Mesh(new THREE.PlaneGeometry(w + 1.25, h + 0.7), hitMat);
  hitMesh.position.set(0.28, cy, 0.1);
  group.add(hitMesh);

  const center = group.localToWorld(new THREE.Vector3(0, cy, 0.08));
  const normal = new THREE.Vector3(-side, 0, 0);

  const entry: ArtworkEntry = {
    post,
    group,
    hitMesh,
    center,
    normal,
    size: { w, h },
    z,
  };
  hitMesh.userData.entry = entry;
  return entry;
}
