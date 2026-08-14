# 链路场景索引（完整 / 分片）

> 2026-08-14T15:40:32.234Z

| 指标 | 数量 |
|---|---:|
| 本包合计 | 185 |
| 完整链路 E2E | 51 |
| 分片场景 SCENE | 134 |
| 合并全量黑盒 | 6913 |
| 合并全量白盒 | 1248 |

## 模块

| 模块 | 条数 | 说明 |
|---|---:|---|
| JOURNEY-分片-市集 | 16 | 见 `BLACKBOX/JOURNEY-分片-市集.csv` |
| JOURNEY-分片-开盒动画 | 24 | 见 `BLACKBOX/JOURNEY-分片-开盒动画.csv` |
| JOURNEY-分片-异常中断 | 8 | 见 `BLACKBOX/JOURNEY-分片-异常中断.csv` |
| JOURNEY-分片-支付入账 | 40 | 见 `BLACKBOX/JOURNEY-分片-支付入账.csv` |
| JOURNEY-分片-支付加揭示 | 25 | 见 `BLACKBOX/JOURNEY-分片-支付加揭示.csv` |
| JOURNEY-分片-概率保底 | 5 | 见 `BLACKBOX/JOURNEY-分片-概率保底.csv` |
| JOURNEY-分片-浏览下单 | 8 | 见 `BLACKBOX/JOURNEY-分片-浏览下单.csv` |
| JOURNEY-分片-结算履约 | 8 | 见 `BLACKBOX/JOURNEY-分片-结算履约.csv` |
| JOURNEY-完整VIP | 3 | 见 `BLACKBOX/JOURNEY-完整VIP.csv` |
| JOURNEY-完整市集 | 3 | 见 `BLACKBOX/JOURNEY-完整市集.csv` |
| JOURNEY-完整开盒 | 45 | 见 `BLACKBOX/JOURNEY-完整开盒.csv` |

## 推荐执行顺序

1. `JOURNEY-完整开盒` 标准全链路（各渠道）
2. `JOURNEY-分片-支付入账` → `JOURNEY-分片-开盒动画` → `JOURNEY-分片-结算履约`
3. `JOURNEY-完整市集` + `JOURNEY-分片-市集`
4. `JOURNEY-分片-异常中断`

## 文件

- `BLACKBOX/JOURNEY_SCENARIOS_BLACKBOX.csv`
- `WHITEBOX/JOURNEY_SCENARIOS_WHITEBOX.csv`

## 再生

```bash
node docs/TEST_CASES/_generate_journey_scenarios.js
```
