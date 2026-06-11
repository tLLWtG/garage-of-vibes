import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

/**
 * SoftBloomPass — 轻量自研 Bloom。
 *
 * 设计动机：UnrealBloomPass 的最终合成依赖 GL 加法混合状态，
 * 在部分 Windows/ANGLE 驱动上会退化为"覆盖"，导致整屏变黑。
 * 这里改为纯着色器数学合成（NoBlending）：
 *   高亮提取(½) → 三级高斯模糊 mip(½, ¼, ⅛) → 场景+辉光 合成进 writeBuffer。
 */

const BLUR_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const HIGHPASS_FRAG = /* glsl */ `
  uniform sampler2D tInput;
  uniform float uThreshold;
  uniform float uKnee;
  varying vec2 vUv;
  void main() {
    vec3 c = texture2D(tInput, vUv).rgb;
    // 防御：滤掉 NaN 与负值，避免污染整条模糊链
    c = clamp(c, vec3(0.0), vec3(64.0));
    if (c.r != c.r || c.g != c.g || c.b != c.b) c = vec3(0.0);
    float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
    float f = smoothstep(uThreshold, uThreshold + uKnee, lum);
    gl_FragColor = vec4(c * f, 1.0);
  }
`;

const BLUR_FRAG = /* glsl */ `
  uniform sampler2D tInput;
  uniform vec2 uDirection;
  uniform vec2 uTexel;
  varying vec2 vUv;
  void main() {
    vec2 step = uDirection * uTexel;
    vec3 sum = texture2D(tInput, vUv).rgb * 0.227027;
    sum += texture2D(tInput, vUv + step * 1.384615).rgb * 0.316216;
    sum += texture2D(tInput, vUv - step * 1.384615).rgb * 0.316216;
    sum += texture2D(tInput, vUv + step * 3.230769).rgb * 0.070270;
    sum += texture2D(tInput, vUv - step * 3.230769).rgb * 0.070270;
    gl_FragColor = vec4(sum, 1.0);
  }
`;

const COMPOSITE_FRAG = /* glsl */ `
  uniform sampler2D tScene;
  uniform sampler2D tMip0;
  uniform sampler2D tMip1;
  uniform sampler2D tMip2;
  uniform float uStrength;
  varying vec2 vUv;
  void main() {
    vec4 scene = texture2D(tScene, vUv);
    vec3 bloom =
      texture2D(tMip0, vUv).rgb * 0.42 +
      texture2D(tMip1, vUv).rgb * 0.34 +
      texture2D(tMip2, vUv).rgb * 0.24;
    gl_FragColor = vec4(scene.rgb + bloom * uStrength, scene.a);
  }
`;

const MIPS = 3;

function makeTarget(w: number, h: number): THREE.WebGLRenderTarget {
  return new THREE.WebGLRenderTarget(Math.max(2, w), Math.max(2, h), {
    type: THREE.HalfFloatType,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: false,
  });
}

export class SoftBloomPass extends Pass {
  strength: number;
  threshold: number;
  knee: number;

  private mips: THREE.WebGLRenderTarget[] = [];
  private temps: THREE.WebGLRenderTarget[] = [];
  private quad = new FullScreenQuad();

  private highpassMat: THREE.ShaderMaterial;
  private blurMat: THREE.ShaderMaterial;
  private compositeMat: THREE.ShaderMaterial;

  constructor(width: number, height: number, strength = 0.5, threshold = 1.0, knee = 0.5) {
    super();
    this.strength = strength;
    this.threshold = threshold;
    this.knee = knee;
    this.needsSwap = true; // 合成结果写入 writeBuffer

    for (let i = 0; i < MIPS; i++) {
      const s = 2 ** (i + 1);
      this.mips.push(makeTarget(width / s, height / s));
      this.temps.push(makeTarget(width / s, height / s));
    }

    this.highpassMat = new THREE.ShaderMaterial({
      uniforms: {
        tInput: { value: null },
        uThreshold: { value: threshold },
        uKnee: { value: knee },
      },
      vertexShader: BLUR_VERT,
      fragmentShader: HIGHPASS_FRAG,
      blending: THREE.NoBlending,
      depthTest: false,
      depthWrite: false,
    });

    this.blurMat = new THREE.ShaderMaterial({
      uniforms: {
        tInput: { value: null },
        uDirection: { value: new THREE.Vector2(1, 0) },
        uTexel: { value: new THREE.Vector2(1, 1) },
      },
      vertexShader: BLUR_VERT,
      fragmentShader: BLUR_FRAG,
      blending: THREE.NoBlending,
      depthTest: false,
      depthWrite: false,
    });

    this.compositeMat = new THREE.ShaderMaterial({
      uniforms: {
        tScene: { value: null },
        tMip0: { value: null },
        tMip1: { value: null },
        tMip2: { value: null },
        uStrength: { value: strength },
      },
      vertexShader: BLUR_VERT,
      fragmentShader: COMPOSITE_FRAG,
      blending: THREE.NoBlending,
      depthTest: false,
      depthWrite: false,
    });
  }

  override setSize(width: number, height: number) {
    for (let i = 0; i < MIPS; i++) {
      const s = 2 ** (i + 1);
      this.mips[i].setSize(Math.max(2, Math.floor(width / s)), Math.max(2, Math.floor(height / s)));
      this.temps[i].setSize(Math.max(2, Math.floor(width / s)), Math.max(2, Math.floor(height / s)));
    }
  }

  private draw(renderer: THREE.WebGLRenderer, mat: THREE.ShaderMaterial, target: THREE.WebGLRenderTarget | null) {
    this.quad.material = mat;
    renderer.setRenderTarget(target);
    this.quad.render(renderer);
  }

  override render(
    renderer: THREE.WebGLRenderer,
    writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget,
  ) {
    const oldAutoClear = renderer.autoClear;
    renderer.autoClear = false;

    // 1. 高亮提取到 ½ 分辨率
    this.highpassMat.uniforms.tInput.value = readBuffer.texture;
    this.highpassMat.uniforms.uThreshold.value = this.threshold;
    this.highpassMat.uniforms.uKnee.value = this.knee;
    this.draw(renderer, this.highpassMat, this.mips[0]);

    // 2. 逐级 降采样 + 双向高斯
    for (let i = 0; i < MIPS; i++) {
      if (i > 0) {
        // 用模糊采样顺带把上一级降到本级
        this.blurMat.uniforms.tInput.value = this.mips[i - 1].texture;
        this.blurMat.uniforms.uTexel.value.set(1 / this.mips[i - 1].width, 1 / this.mips[i - 1].height);
        this.blurMat.uniforms.uDirection.value.set(1, 0);
        this.draw(renderer, this.blurMat, this.mips[i]);
      }
      this.blurMat.uniforms.uTexel.value.set(1 / this.mips[i].width, 1 / this.mips[i].height);

      this.blurMat.uniforms.tInput.value = this.mips[i].texture;
      this.blurMat.uniforms.uDirection.value.set(1, 0);
      this.draw(renderer, this.blurMat, this.temps[i]);

      this.blurMat.uniforms.tInput.value = this.temps[i].texture;
      this.blurMat.uniforms.uDirection.value.set(0, 1);
      this.draw(renderer, this.blurMat, this.mips[i]);
    }

    // 3. 合成：场景 + 辉光 → writeBuffer（或屏幕）
    this.compositeMat.uniforms.tScene.value = readBuffer.texture;
    this.compositeMat.uniforms.tMip0.value = this.mips[0].texture;
    this.compositeMat.uniforms.tMip1.value = this.mips[1].texture;
    this.compositeMat.uniforms.tMip2.value = this.mips[2].texture;
    this.compositeMat.uniforms.uStrength.value = this.strength;
    this.draw(renderer, this.compositeMat, this.renderToScreen ? null : writeBuffer);

    renderer.autoClear = oldAutoClear;
  }

  override dispose() {
    for (const t of [...this.mips, ...this.temps]) t.dispose();
    this.highpassMat.dispose();
    this.blurMat.dispose();
    this.compositeMat.dispose();
    this.quad.dispose();
  }
}
