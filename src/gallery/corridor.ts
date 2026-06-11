import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';

/** 长廊的全部尺寸常量（米） */
export const CORRIDOR = {
  width: 7,
  height: 4.6,
  spacing: 7.5, // 相邻画作的间距
  firstOffset: 4.2, // 第一幅画与入口的距离（保证开场能看到它）
  startPad: 9, // 入口端余量
  endPad: 12, // 尽头端余量
};

export interface Corridor {
  group: THREE.Group;
  maxScroll: number;
  update(t: number): void;
}

const WARM = 0xffe8cd;

export function buildCorridor(scene: THREE.Scene, count: number): Corridor {
  const { width, height, spacing, firstOffset, startPad, endPad } = CORRIDOR;
  const maxScroll = firstOffset + Math.max(1, count - 1) * spacing;
  const zStart = startPad;
  const zEnd = -(maxScroll + endPad);
  const length = zStart - zEnd;
  const zMid = (zStart + zEnd) / 2;

  const g = new THREE.Group();

  // ---------------------------------------------------------- 地板：镜面 + 面纱
  const reflector = new Reflector(new THREE.PlaneGeometry(width + 0.4, length), {
    clipBias: 0.004,
    textureWidth: 1024,
    textureHeight: 1024,
    color: 0x37373b,
  });
  reflector.rotation.x = -Math.PI / 2;
  reflector.position.set(0, 0, zMid);
  g.add(reflector);

  const veil = new THREE.Mesh(
    new THREE.PlaneGeometry(width + 0.4, length),
    new THREE.MeshStandardMaterial({
      color: 0x0c0c0e,
      roughness: 0.4,
      metalness: 0,
      transparent: true,
      opacity: 0.72,
    }),
  );
  veil.rotation.x = -Math.PI / 2;
  veil.position.set(0, 0.012, zMid);
  g.add(veil);

  // ---------------------------------------------------------- 墙体与天花
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x17171b, roughness: 0.92 });
  const wallGeo = new THREE.PlaneGeometry(length, height);

  const left = new THREE.Mesh(wallGeo, wallMat);
  left.rotation.y = Math.PI / 2;
  left.position.set(-width / 2, height / 2, zMid);
  g.add(left);

  const right = new THREE.Mesh(wallGeo, wallMat);
  right.rotation.y = -Math.PI / 2;
  right.position.set(width / 2, height / 2, zMid);
  g.add(right);

  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(width + 0.4, length),
    new THREE.MeshStandardMaterial({ color: 0x070708, roughness: 1 }),
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, height, zMid);
  g.add(ceiling);

  // 两端封口
  const endWall = new THREE.Mesh(new THREE.PlaneGeometry(width + 0.4, height), wallMat);
  endWall.position.set(0, height / 2, zEnd);
  g.add(endWall);

  const entranceWall = new THREE.Mesh(new THREE.PlaneGeometry(width + 0.4, height), wallMat);
  entranceWall.rotation.y = Math.PI;
  entranceWall.position.set(0, height / 2, zStart);
  g.add(entranceWall);

  // ---------------------------------------------------------- 踢脚线
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x08080a,
    roughness: 0.45,
    metalness: 0.5,
  });
  const baseGeo = new THREE.BoxGeometry(0.05, 0.16, length);
  const baseL = new THREE.Mesh(baseGeo, baseMat);
  baseL.position.set(-width / 2 + 0.025, 0.08, zMid);
  g.add(baseL);
  const baseR = new THREE.Mesh(baseGeo, baseMat);
  baseR.position.set(width / 2 - 0.025, 0.08, zMid);
  g.add(baseR);

  // ---------------------------------------------------------- 檐口线脚：给墙顶与天花一条边界
  const corniceMat = new THREE.MeshStandardMaterial({
    color: 0x0d0d10,
    roughness: 0.3,
    metalness: 0.7,
  });
  const corniceGeo = new THREE.BoxGeometry(0.06, 0.14, length);
  const corniceL = new THREE.Mesh(corniceGeo, corniceMat);
  corniceL.position.set(-width / 2 + 0.03, height - 0.07, zMid);
  g.add(corniceL);
  const corniceR = new THREE.Mesh(corniceGeo, corniceMat);
  corniceR.position.set(width / 2 - 0.03, height - 0.07, zMid);
  g.add(corniceR);
  // 尽头端墙同高收口，透视上与两侧檐口相接
  const corniceEnd = new THREE.Mesh(new THREE.BoxGeometry(width + 0.4, 0.14, 0.06), corniceMat);
  corniceEnd.position.set(0, height - 0.07, zEnd + 0.03);
  g.add(corniceEnd);

  // ---------------------------------------------------------- 天花结构梁：透视节奏让天花被读出来
  const beamGeo = new THREE.BoxGeometry(width + 0.4, 0.12, 0.14);
  for (let i = -1; i <= count; i++) {
    const bz = -(firstOffset + (i + 0.5) * spacing);
    if (bz > zStart - 1 || bz < zEnd + 1.5) continue;
    const beam = new THREE.Mesh(beamGeo, corniceMat);
    beam.position.set(0, height - 0.06, bz);
    g.add(beam);
  }

  // ---------------------------------------------------------- 天花灯带：两条发丝光线引向尽头
  const stripMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(WARM).multiplyScalar(1.32),
  });
  const stripGeo = new THREE.BoxGeometry(0.04, 0.015, length);
  const stripL = new THREE.Mesh(stripGeo, stripMat);
  stripL.position.set(-width / 2 + 0.18, height - 0.012, zMid);
  g.add(stripL);
  const stripR = new THREE.Mesh(stripGeo, stripMat);
  stripR.position.set(width / 2 - 0.18, height - 0.012, zMid);
  g.add(stripR);

  // ---------------------------------------------------------- 尽头的光缝
  const slit = new THREE.Mesh(
    new THREE.PlaneGeometry(0.055, 2.6),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff1da).multiplyScalar(2.4) }),
  );
  slit.position.set(0, 1.72, zEnd + 0.04);
  g.add(slit);

  const slitLight = new THREE.PointLight(0xffe8cc, 5, 11, 2);
  slitLight.position.set(0, 1.8, zEnd + 0.7);
  g.add(slitLight);

  // ---------------------------------------------------------- 浮尘
  const dustCount = Math.min(460, 48 * count + 120);
  const positions = new Float32Array(dustCount * 3);
  const base = new Float32Array(dustCount * 3);
  const phase = new Float32Array(dustCount);
  for (let i = 0; i < dustCount; i++) {
    base[i * 3] = (Math.random() - 0.5) * (width - 1.4);
    base[i * 3 + 1] = 0.25 + Math.random() * (height - 0.7);
    base[i * 3 + 2] = zEnd + 2 + Math.random() * (length - 4);
    phase[i] = Math.random() * Math.PI * 2;
  }
  positions.set(base);
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const dustAttr = dustGeo.getAttribute('position') as THREE.BufferAttribute;
  dustAttr.setUsage(THREE.DynamicDrawUsage);
  const dustMat = new THREE.PointsMaterial({
    color: 0xffe9cf,
    size: 0.02,
    transparent: true,
    opacity: 0.34,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });
  // 距相机很近的粒子会被放大成方块：限制屏幕尺寸并裁成圆点
  dustMat.onBeforeCompile = (shader) => {
    // 注意：gl_PointSize 在 project_vertex 之后才被赋值，须在更晚的 chunk 钳制
    shader.vertexShader = shader.vertexShader.replace(
      '#include <fog_vertex>',
      'gl_PointSize = min(gl_PointSize, 9.0);\n\t#include <fog_vertex>',
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      'void main() {',
      'void main() {\n\tvec2 pc = gl_PointCoord * 2.0 - 1.0;\n\tif (dot(pc, pc) > 1.0) discard;',
    );
  };
  const dust = new THREE.Points(dustGeo, dustMat);
  g.add(dust);

  scene.add(g);

  function update(t: number) {
    const arr = dustAttr.array as Float32Array;
    for (let i = 0; i < dustCount; i++) {
      const p = phase[i];
      arr[i * 3] = base[i * 3] + Math.sin(t * 0.13 + p * 1.7) * 0.24;
      arr[i * 3 + 1] = base[i * 3 + 1] + Math.sin(t * 0.21 + p) * 0.32;
    }
    dustAttr.needsUpdate = true;
  }

  return { group: g, maxScroll, update };
}
