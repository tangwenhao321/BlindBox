# 全量优化说明（测试与质量基建）

> 2026-08-15（含 Round 4）

## Round 4 要点

- settle CAS + 库存并发不超卖
- JaCoCo 资金包 **10% 硬门禁**
- `REAL_TEST_MAPPING.md`：runner → 真实 suites
- Maestro inventory 进 catalog job；真机见 `MAESTRO_DEVICE.md`

历史 R1–R3 见 `OPTIMIZATION_R2.md` / `OPTIMIZATION_R3.md`。

## 诚实边界

目录 6913 PASS 含大量 contract-proxy；真测以 `REAL_TEST_MAPPING.md` + Mockito/JDBC/Spring IT 为准。

## 回归

```bash
node docs/TEST_CASES/AUTOMATION/classify-cases.js
node docs/TEST_CASES/AUTOMATION/map-runner-to-real-tests.js
node docs/TEST_CASES/AUTOMATION/execute-all-cases.js
cd mystery-box-backend && mvn "-Dtest=MarketplaceSettleClaimJdbcIT,RefundReconciliationJobParameterizedTest,PaymentNotifyRealServiceParameterizedTest" test
```
