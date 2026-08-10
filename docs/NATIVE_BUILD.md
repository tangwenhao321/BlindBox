# 原生包构建：Android / iOS / 鸿蒙

开箱动效已全量迁移至 **react-native-reanimated 4**（含 `react-native-worklets`）。**Expo Go 无法加载 Reanimated 原生模块**，请务必使用下方「开发构建」命令安装到真机/模拟器。

## 环境要求

| 平台 | 工具 |
|------|------|
| Android | Android Studio、SDK 35+、JDK 17；Windows 需设置 `ANDROID_HOME`（默认 `%LOCALAPPDATA%\Android\Sdk`）并将 `platform-tools` 加入 `PATH` |
| iOS（仅 macOS） | Xcode 16+、CocoaPods |
| 鸿蒙 | DevEco Studio、OpenHarmony SDK（见下文） |

## 一键脚本（推荐）

在 `mystery-box-mobile-app` 目录：

```powershell
# Windows：首次安装 Android SDK（仅需一次，约 1.5GB）
npm run setup:android
# 安装后请重启终端，使 ANDROID_HOME 生效

# 生成 android/、ios/ 原生工程（首次或插件变更后）
npm run prebuild

# Android 真机 / 模拟器
npm run android

# iOS 模拟器（需 macOS）
npm run ios

# iOS 真机
npm run ios:device
```

## 分步说明

### 1. 安装依赖

```bash
cd mystery-box-mobile-app
npm ci
npm run generate:sounds
```

### 2. 预构建原生目录

```bash
npx expo prebuild --clean
```

会按 `app.config.js` 写入：

- iOS：`bundleIdentifier` = `com.mysterybox.mobile`
- Android：`package` = `com.mysterybox.mobile`
- Reanimated / Lottie / Notifications 等原生配置

### 3. Android

```bash
npx expo run:android
# 或指定设备
npx expo run:android --device
```

Metro 默认端口与 `.env` 中 `EXPO_PUBLIC_API_BASE_URL` 保持一致（开发机局域网 IP，勿用 127.0.0.1）。

### 4. iOS（Apple）

```bash
cd ios && pod install && cd ..
npx expo run:ios
# 真机
npx expo run:ios --device
```

在 Xcode 中配置 **Signing & Capabilities**（Team、Bundle ID）。推送需开启 Push Notifications capability。

### 5. 鸿蒙（HarmonyOS / OpenHarmony）

**Expo 官方尚未提供 `expo run:harmony`。** 当前仓库的 JS 层可在鸿蒙上运行，但需走 **React Native OpenHarmony（RNOH）** 或厂商提供的 RN 鸿蒙移植方案，步骤概览：

1. 使用 [react-native-openharmony](https://gitee.com/openharmony-sig/ohos_react_native) 或华为 **RNOH** 模板创建鸿蒙工程。
2. 将本应用 `src/`、`App.tsx`、依赖版本与 Expo 预构建产物中的原生模块清单对齐（Reanimated、Lottie、SVG 等需确认鸿蒙侧是否有对应 port）。
3. 在 DevEco Studio 中编译 HAP，安装到 HarmonyOS NEXT 设备。

**适配建议**

- 动效：Reanimated 在鸿蒙需对应 native 库；若不可用，设置内开启「纯文字揭晓」降级。
- 支付：`react-native-wechat-lib` 需鸿蒙微信支付 SDK 单独接入。
- 推送：使用鸿蒙 Push Kit 替代 Expo Notifications。

后续若团队确定 RNOH 方案，可在仓库增加 `harmony/` 目录与 CI 文档。

## 开发时 Metro

原生包装好后，日常可：

```bash
npx expo start --dev-client --port 8083
```

在已安装开发构建的 App 中扫码连接。

## 自检

```bash
npm run check
npx expo-doctor
```

## 相关文档

- [REVEAL_AND_OPS.md](./REVEAL_AND_OPS.md) — 开箱动效与运维
- [Expo Development builds](https://docs.expo.dev/develop/development-builds/introduction/)
