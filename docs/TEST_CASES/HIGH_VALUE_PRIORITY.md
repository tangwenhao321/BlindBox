# 高价值域全量补齐说明

> 生成时间：2026-08-14T15:40:32.058Z

## 为什么先补这些

按**资损风险 × 发生频率 × 监管/对账成本**排序，优先全量补齐：

1. **多渠道支付入账与回调幂等**（微信 / VNPay / MoMo / Mock）
2. **退款渠道矩阵与工单兜底**（含 MoMo 未开通、WX 未配置）
3. **订单状态 × 动作判定表**（真实 `ProductOrderStatus`）
4. **下单/计价/限购/库存并发**
5. **开盒队列买断锁 / 公平性 / 对账 Job**
6. **VIP 并行资金链、管理端已支付取消与发货**
7. **高危鉴权 action-grant / 短信风控**

## 本轮增量

| 指标 | 数量 |
|---|---:|
| 高价值黑盒 | 1091 |
| 高价值白盒 | 626 |
| 合并后全量黑盒 | 6079 |
| 合并后全量白盒 | 998 |

## 文件

- `BLACKBOX/HIGH_VALUE_BLACKBOX.csv`
- `WHITEBOX/HIGH_VALUE_WHITEBOX.csv`
- 已合并进 `ALL_BLACKBOX_CASES.csv` / `ALL_WHITEBOX_CASES.csv`（`关联*`列指向 `HV-*` ID）

## 再生

```bash
node docs/TEST_CASES/_generate_thousands.js   # 基底
node docs/TEST_CASES/_generate_high_value.js  # 高价值叠加（可重复执行）
```

## 覆盖声明

- 高价值域：**状态×动作判定表 + 渠道×场景矩阵 + 端到端旅程 + 白盒条件/成对/并发/回滚** 已全量展开。
- 仍非全项目路径笛卡尔积；低风险 CRUD 维持标准展开即可。
