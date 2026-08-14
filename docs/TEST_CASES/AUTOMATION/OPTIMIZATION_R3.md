# 全量优化 Round 3

> 2026-08-15

## 目标

把「能跑绿」推进到「分层可见 + 资金真 SQL/Job 更深」。

## 交付

| 项 | 产物 |
|---|---|
| Notify 幂等 SQL IT | `PaymentNotifyLogJdbcIT` |
| 退款 stuck SQL IT | `RefundStuckQueryJdbcIT` |
| 对账 Job 参数化 | `RefundReconciliationJobParameterizedTest` |
| 库存耗尽 | PrizeStock IT 新用例 |
| JaCoCo 资金包 | pom includes + 8% soft / CI 观测 |
| 分层报告 | `LAYERED_COVERAGE_REPORT.md` |
| FPS 采样门 | `PERF_FPS_SAMPLE_FILE` |
| Admin 资金矩阵 | format-money fee matrix |

## 未做（需设备/沙箱）

- Maestro 真机 farm 默认开启
- 微信/VNPay/MoMo 沙箱联调
- JaCoCo 硬失败门禁（待覆盖率稳定后去掉 continue-on-error）
