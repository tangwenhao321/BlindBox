# 全量优化说明（测试与质量基建）

> 2026-08-15（含 Round 3）

## 已落地

### Round 1–2
资金状态机/真实 Service 参数化、Testcontainers 基类、JaCoCo、CI catalog、MANUAL→代理、工程卫生。

### Round 3（本轮）
1. **资金 JDBC 真链路**
   - `PaymentNotifyLogJdbcIT`（notify tryBegin 幂等 / FAILED 回收）
   - `RefundStuckQueryJdbcIT`（stuck REFUNDING 选择）
   - `MarketplaceCoolingQueryJdbcIT`（既有）
2. **退款对账参数化** — `RefundReconciliationJobParameterizedTest`
3. **库存耗尽 IT** — `PrizeStockServiceSpringIntegrationTest#drawExhaustsStock_thenRejectsFurtherDraw`
4. **JaCoCo 资金包门禁** — includes 限 marketplace/payment/refund/order/stock，soft floor **8%**（CI `continue-on-error` 观测）
5. **目录分层报告** — `LAYERED_COVERAGE_REPORT.md` + FULL 报告 byDepth（防 100% 误解）
6. **性能采样门** — `collect-reveal-fps.mjs` 支持 `PERF_FPS_SAMPLE_FILE` / `PERF_REQUIRE_REAL`
7. **Admin 手续费矩阵** — `format-money.test.ts` fee matrix

## 诚实边界

目录 PASS ≠ 真机/真网关 E2E。分层见 `LAYERED_COVERAGE_REPORT.md`。

## 回归

```bash
node docs/TEST_CASES/AUTOMATION/execute-all-cases.js
cd mystery-box-backend && mvn "-Dtest=PaymentNotifyRealServiceParameterizedTest,RefundReconciliationJobParameterizedTest,RefundPaidAfterCancelGateParameterizedTest,MarketplaceBuyGateParameterizedTest" test
```
