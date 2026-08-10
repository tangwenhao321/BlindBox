# 开箱特效资源

当前开箱动画使用 **React Native Animated**（Expo Go 可直接运行）。

若需接入 Lottie：

1. 安装 `lottie-react-native`（通常需 dev build，Expo Go 可能不支持自定义 native 模块）
2. 将 JSON 放入本目录，例如 `box-open.json`、`legendary-burst.json`
3. 在 `OpenBoxRevealOverlay` 中按 `reduceMotion` / `lowPerf` 条件挂载 `LottieView`

音效 MP3 可放在 `src/assets/sounds/`（`general.mp3`、`hidden.mp3`、`legendary.mp3`），由 `effects/sound.ts` 加载；未放置时使用远程 CDN 并配合触觉反馈。
