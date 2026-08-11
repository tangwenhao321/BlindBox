# 开箱特效资源

当前开箱动画主路径使用 **React Native Animated / Reanimated**（Expo Go 可直接运行）。Lottie 为可选增强，由 `OptionalLottieBurst` 按档位挂载。

## Lottie 档位诚实说明（现状）

在独立资产到位之前，**多档位共用同一 JSON**：

| Ceremony / prize tier | Asset file | Notes |
| --- | --- | --- |
| `GENERAL` + `HIDDEN` | `box-open.json` | Same clip; HIDDEN uses slightly larger scale / slower speed |
| Legend tiers (`LEGENDARY`, `TREASURE_LEGEND`, `PEERLESS`, `TREASURE_PEERLESS`, …) | `legendary-burst.json` | Same burst; scale/speed differ per tier |

See `src/components/ui/OptionalLottieBurst.tsx` (`SOURCES` map). When distinct per-tier Lotties ship, update that map and this table — do not assume filenames imply unique motion.

## 接入说明

1. 安装 `lottie-react-native`（通常需 dev build，Expo Go 可能不支持自定义 native 模块）
2. 将 JSON 放入本目录
3. 在 `OpenBoxRevealOverlay` / `OptionalLottieBurst` 中按 `reduceMotion` / `lowPerf` 条件挂载 `LottieView`

音效 MP3 可放在 `src/assets/sounds/`（`general.mp3`、`hidden.mp3`、`legendary.mp3`），由 `effects/sound.ts` 加载；未放置时使用远程 CDN 并配合触觉反馈。
