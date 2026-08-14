# 开盒链路 × 市集 × 性能 × 安全 — 全量补齐

> 2026-08-14T15:40:32.170Z

## 覆盖范围（对照真实实现）

### 开盒链路
- 下单/pack/支付回跳、结果结算、仓库
- 特效：稀有度仪式、模板(lively/minimal/turbo/eyeCare/collectMinimal)、节奏、粒子/闪屏/震动
- 音效：主开关与分层、未成年静音、录制安全、warmup/取消排程
- 跳过：`revealSkipPolicy` guarded 首击暂停 / 连点或长按跳过
- 加速：1.5x / 2.5x + temporaryTurbo
- 降级：reduceMotion、弱网、离线包、ExpoGo
- 概率公示、pity保底、公平性、EV门禁
- 队列/买断锁、SSE、观战房

### 市集
- 上架/取消/购买/冷静期取消/结算打款/外部打款
- 状态机 listing + trade 判定表
- 聊天 SSE、信用、证书、评价、仓库发货同步
- 费率、幂等键、iOS/年龄/信用门禁

### 性能 / 安全
- 动画 FPS/内存、连开、SSE长连、抢购压测
- 回调伪造/重放、越权、XSS、OTP、mockPay 生产关闭等

## 数量

| 指标 | 数量 |
|---|---:|
| 本包黑盒 | 649 |
| 本包白盒 | 213 |
| 合并全量黑盒 | 6728 |
| 合并全量白盒 | 1211 |

## 文件
- `BLACKBOX/DRAW_MARKETPLACE_PERF_SEC_BLACKBOX.csv`
- `WHITEBOX/DRAW_MARKETPLACE_PERF_SEC_WHITEBOX.csv`
- 已合并 `ALL_*`

## 再生
```bash
node docs/TEST_CASES/_generate_draw_marketplace.js
```
（内部会先跑 thousands + high_value 再叠加本包）
