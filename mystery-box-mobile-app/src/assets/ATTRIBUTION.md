# 开箱音效 / Lottie 素材来源

本目录资源均为可商用的免费素材（CC0 或 Lottie Simple License），未使用受版权保护的影视配乐。

## 音效（CC0）

| 来源 | 许可 | 用途 |
| --- | --- | --- |
| [Kenney Interface Sounds](https://kenney.nl/assets/interface-sounds) | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) | 经典确认音、赛博故障/开合、蓄力 tick |
| [Kenney RPG Audio](https://kenney.nl/assets/rpg-audio) | CC0 | 冒险门闩/开门/木响、ASMR 翻书/布料 |
| [Kenney Music Jingles](https://kenney.nl/assets/music-jingles) | CC0 | 各主题氛围循环与揭晓短句（HIT / NES / PIZZA / SAX / STEEL） |
| [artisticdude RPG Sound Pack](https://opengameart.org/content/rpg-sound-pack) | CC0 | ASMR 气泡、派对金币/挥击 |

重新导入（需本地 `_tmp_assets` 源包与 `ffmpeg-static`）：

```bash
node scripts/importRoyaltyFreeSounds.mjs
```

合成占位音效脚本 `generateRevealSounds.mjs` 在存在 `src/assets/sounds/.royalty-free` 时会跳过，避免覆盖真实采样。

## Lottie（Lottie Simple License）

| 文件 | 用途 | 说明 |
| --- | --- | --- |
| `effects/box-open.json` | 普通档揭晓 | 丝带/色块爆发（LottieFiles 社区免费动画） |
| `effects/hidden-burst.json` | 隐藏档揭晓 | 成功勾选 + 光圈 |
| `effects/legendary-burst.json` | 传说档揭晓 | 礼花炮 |
| `effects/peerless-burst.json` | 绝世档揭晓 | 高密度彩纸 |

LottieFiles 公共动画遵循 [Lottie Simple License](https://lottiefiles.com/license)（可商用；署名非强制）。
