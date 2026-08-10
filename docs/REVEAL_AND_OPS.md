# 开箱动效与运维

## 客户端

- 设置 → **开箱动画** / **纯文字揭晓**（互斥，AsyncStorage）
- 远程调节：`GET /front/app/config`
  - `revealParticleScale` / `revealConfettiScale` / `revealDelayMsOverride`（0 = 客户端默认）
  - `revealChargeScale` / `revealFlashScale` / `revealLustreScale`（蓄力时长、闪光、琉光强度）
  - `revealLustrePaletteId`（`neon` | `cute` | `luxury` | `warm` | `cool` | `vivid`，远程覆盖琉光色相）
  - `revealLustreBoxOverrides`（按盲盒 ID 覆盖 palette，如 `box-123:vivid,box-456:luxury`；优先于全局 `revealLustrePaletteId`）
  - `revealFeedTickerEnabled`（揭晓时顶部欧皇播报）
  - `revealThemeId`（`default` | `neon` | `cute` | `luxury`，也可按盲盒分类名自动推断）
  - `revealIntroVideoUri`（预留远程 MP4，当前用 cinematic 扫光 + Lottie 兜底）
- 连抽汇总：**去仓库** / **再开一单**
- 揭晓增强（品质文案仍为 普通/隐藏/传说）：
  - 蓄力环 + **charge.wav** 音效 → 爆发音
  - 多抽最后一发 **镜头推拉**（finale zoom）
  - 顶档 **cinematic 扫光** + 双闪
  - 系列主题色 / 粒子形状（数码→碎片、萌系→星形等）
  - 传说分享卡 **爆闪边框 + 传说爆闪** 印章
  - 详情页 **琉光开箱 CTA**（含传说/隐藏款时）
  - 仓库稀有款 **缩略图琉光描边**
  - 开箱时 **SSE 欧皇播报** ticker（`RevealFeedTicker`）
- 掉帧降级：`revealFrameMonitor` + `sessionPerf`
- **全量 Reanimated 4**：揭晓链路、Confetti、汇总屏、详情 CTA、Toast 等均已迁移
- 稀有光环：`RevealRareGlow`
- 订单详情：异常时展示「开奖数据需核对」（`draw-integrity` API）
- 音效：`npm run generate:sounds` → `general/hidden/legendary/charge.wav`
- Lottie：`src/assets/effects/`
- **原生包**：见 [NATIVE_BUILD.md](./NATIVE_BUILD.md)（Android / iOS / 鸿蒙说明）

## 后端

```yaml
app:
  reveal:
    particle-scale: 1.0
    confetti-scale: 1.0
    delay-ms-override: 0
    charge-scale: 1.0
    flash-scale: 1.0
    lustre-scale: 1.0
    lustre-palette-id: ""
    lustre-box-overrides: ""
    feed-ticker-enabled: true
    theme-id: ""
    intro-video-uri: ""
  jobs:
    draw-integrity:
      enabled: true
      cron: "0 30 4 * * ?"
      lookback-hours: 24
      batch-size: 200
```

| 接口 | 说明 |
|------|------|
| `GET /front/mystery-box-order/{id}/draw-integrity` | 用户自查开奖数量/封面 |
| 定时任务 `OrderDrawIntegrityReconciliationJob` | 扫描近期已支付订单，异常写入审计日志 |

## E2E（Maestro）

```bash
cd mystery-box-mobile-app
maestro test .maestro/flows/smoke.yaml .maestro/flows/mock-pay-smoke.yaml
# 可选：settings-reveal-smoke.yaml（需已进入账号设置）
```

## 自检

```bash
cd mystery-box-mobile-app && npm run generate:sounds && npm run check
cd mystery-box-backend && mvn -q -Dtest=OrderDrawIntegrityServiceTest,AppPublicConfigIntegrationTest test
```

## 发布注意

- 必须使用 **开发构建**（`npm run prebuild` + `npm run android` / `ios`），Expo Go 不支持 Reanimated
- 对账任务负责人见 `RELEASE_CHECKLIST.md` §2
