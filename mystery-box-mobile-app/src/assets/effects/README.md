# 开箱特效资源

当前开箱动画主路径使用 **React Native Animated / Reanimated**（Expo Go 可直接运行）。Lottie 为可选增强，由 `OptionalLottieBurst` 按档位挂载。

## Lottie 档位

| Ceremony / prize tier | Asset file | Motion |
| --- | --- | --- |
| `GENERAL` | `box-open.json` | Ribbon / shape burst |
| `HIDDEN` | `hidden-burst.json` | Success check + rings |
| `LEGENDARY`, `TREASURE_LEGEND` | `legendary-burst.json` | Confetti cannons |
| `PEERLESS`, `TREASURE_PEERLESS` | `peerless-burst.json` | Dense confetti |

See `src/components/ui/OptionalLottieBurst.tsx` (`SOURCES` map) and `src/assets/ATTRIBUTION.md`.

## Doc2 分镜（Reanimated）

`RevealStoryboardLayer` 按 `storyboard` 播放四套程序分镜（非 Lottie 电影）：

| storyboard | 悬念 | 开启 | 揭晓 |
| --- | --- | --- | --- |
| adventure | 羊皮卷 + 烛光 + 罗盘 | 金光缝 | 迷雾 + 宝藏标记 + 越文字幕 |
| cyberpunk | 全息罩 + 数据流 | RGB 色散 / 扫描线 | 霓虹圈（稀有度层数）+ 像素淡出 |
| asmr | 云朵呼吸 + 丁达尔光 | 花瓣绽放 | 泡泡 / 暖色 |
| party | 迪斯科球 + 频闪灯 | 礼花爆闪 | 舞台剪影 + 跑马灯 |
| classic | 沿用原蓄力环流水线 | — | — |

弱网 / 减少动效 / 掉帧档 ≥2 时回退 classic。

## 电影级叠层

`CinematicRevealLayer` 使用 Kenney Particle Pack（CC0）的光斑 / 体积光 / 星芒精灵，按主题着色，并加上宽银幕遮幅与缓慢推镜。素材在 `src/assets/effects/particles/`。

## 接入说明

1. 安装 `lottie-react-native`（通常需 dev build，Expo Go 可能不支持自定义 native 模块）
2. 将 JSON 放入本目录
3. 在 `OpenBoxRevealOverlay` / `OptionalLottieBurst` 中按 `reduceMotion` / `lowPerf` 条件挂载 `LottieView`

音效 WAV 放在 `src/assets/sounds/<theme>/`，由 `effects/sound.ts` 加载。
