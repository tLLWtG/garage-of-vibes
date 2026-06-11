---
title: Three.js 后期处理：让黑暗发光的 Bloom
date: 2026-03-30
summary: 高阈值的 Bloom 是深色场景的点睛之笔——前提是管住它。
variant: geo
---

深色场景里最容易翻车的后期效果就是 Bloom：阈值一低，整个画面像蒙了一层雾，所有的精致瞬间变成廉价的梦境滤镜。

但完全不开 Bloom，灯具又会显得"死"——现实里的光源边缘总有一圈柔和的溢出。

## 管线

这座画廊的后期管线非常短：

```ts
const composer = new EffectComposer(renderer, target);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new SoftBloomPass(width, height, 0.45, 1.0, 0.55));
composer.addPass(new OutputPass());
```

三个 pass，没有更多。抗锯齿交给多重采样的渲染目标，省下一个 FXAA。

`SoftBloomPass` 是自己写的：官方的 `UnrealBloomPass` 在我这台 Windows
机器的 ANGLE 驱动上，最后那步加法混合会退化成"覆盖"，整屏直接变黑。
自研版本改用纯着色器做合成——高亮提取、三级高斯 mip、一次性数学相加，
不依赖任何 GL 混合状态，一百多行，反而更好调。

## 阈值即纪律

`UnrealBloomPass` 的第三个参数 `threshold` 决定了"多亮才算光"。我把它放在 0.85 附近，并且约束场景里只有三类东西能越过这条线：

- 射灯灯头的发光圆片；
- 天花两侧的灯带；
- 走廊尽头那道光缝。

画作、墙面、地板，全部待在阈值之下。于是 Bloom 只为真正的光源服务，黑暗依旧是干净的黑暗。

## 参数备忘

- `strength: 0.35` —— 再高就开始起雾；
- `radius: 0.6` —— 光晕的扩散范围，宁小勿大；
- 渲染目标用 `HalfFloatType`，否则高光梯度会出现色带。

Bloom 像香水，闻得到的时候已经太多了。
