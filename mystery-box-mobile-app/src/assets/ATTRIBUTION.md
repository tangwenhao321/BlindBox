# 开箱音效 / Lottie 素材来源

本目录资源均为可商用的免费素材（CC0 或 Lottie Simple License），未使用受版权保护的影视配乐。

## 音效（Mixkit License / 可商用）

| 来源 | 许可 | 用途 |
| --- | --- | --- |
| [Mixkit Cinematic / Magic / Whoosh](https://mixkit.co/free-sound-effects/cinematic/) | [Mixkit License](https://mixkit.co/license/) | 开箱氛围、蓄力、揭晓与主题 sting（classic / adventure / cyberpunk / ASMR / party） |

重新导入：

```bash
node scripts/importCinematicSounds.mjs
```

旧版 Kenney UI jingle 导入脚本 `importRoyaltyFreeSounds.mjs` 仍保留，但会被电影级 Mixkit 库覆盖。`generateRevealSounds.mjs` 在存在 `src/assets/sounds/.royalty-free` 时会跳过。

## Lottie（Lottie Simple License）

| 文件 | 用途 | 说明 |
| --- | --- | --- |
| `effects/box-open.json` | 普通档揭晓 | 丝带/色块爆发（LottieFiles 社区免费动画） |
| `effects/hidden-burst.json` | 隐藏档揭晓 | 成功勾选 + 光圈 |
| `effects/legendary-burst.json` | 传说档揭晓 | 礼花炮 |
| `effects/peerless-burst.json` | 绝世档揭晓 | 高密度彩纸 |

LottieFiles 公共动画遵循 [Lottie Simple License](https://lottiefiles.com/license)（可商用；署名非强制）。

## 电影级粒子 / 镜头光晕（CC0）

| 来源 | 许可 | 用途 |
| --- | --- | --- |
| [Kenney Particle Pack](https://kenney.nl/assets/particle-pack) | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) | 变形宽银幕光晕、体积光、星芒、火花、烟雾；见 `effects/particles/` |

由 `CinematicRevealLayer` 按主题着色后铺满屏幕（宽银幕遮幅 + 轻微推镜）。
