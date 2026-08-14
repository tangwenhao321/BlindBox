# 全量优化说明（测试与质量基建）

> 2026-08-15（含 Round 2）

## 已落地

1. **资金/状态机参数化**
   - `OrderStatusActionMatrixTest`
   - `PaymentNotifyDecisionMatrixTest`
   - `PaymentMockProductionGuardTest`
   - `PaymentNotifyRealServiceParameterizedTest`（VNPay 幂等 / 微信金额 / MoMo 签名）
   - `MarketplaceBuyGateParameterizedTest`（非 ON_SALE / 信用 / 自购）
   - `RefundPaidAfterCancelGateParameterizedTest`（取消后到账状态门）
   - `MarketplaceCoolingJobTest` + 手续费边界（`MarketplaceServiceTest`）

2. **Testcontainers**
   - `AbstractMysqlRedisSpringBootIT` + `PrizeStockServiceSpringIntegrationTest`
   - `MarketplaceCoolingQueryJdbcIT`（冷却查询 SQL，纯 JDBC）

3. **JaCoCo**
   - prepare-agent + report；`verify` soft floor（BUNDLE 行覆盖 ≥5%）
   - CI 上传 `backend-jacoco` artifact

4. **CI / Maestro / 性能**
   - `catalog-automation`：全量用例 + Vitest 代理 + 资金参数化 Maven + `perf-lab-gate.sh`
   - Maestro PR smoke 扩列：mock-pay / marketplace / checkout / fairness / settings-reveal
   - `collect-reveal-fps.mjs` stub（`PERF_LAB_DEVICE=1`）

5. **MANUAL 降级**
   - 相位加速 / 设置正交 / 全特效 / 性能预算 / mockPay 生产守卫 → `AUTO_UNIT` 代理
   - 目录 MANUAL 残差：**0**

6. **工程卫生**
   - `.gitignore`：`*.tsbuildinfo`、`compile.out`、`dc-raw.java`

## 诚实边界

全量 6913 黑盒目录执行 ≠ 真机/真网关 E2E；资金路径以 Mockito 真实 Service + SQL IT 加深，设备 FPS/微信仍为代理或可选 lab。

## 再生 / 回归

```bash
node docs/TEST_CASES/AUTOMATION/classify-cases.js
node docs/TEST_CASES/AUTOMATION/execute-all-cases.js
cd mystery-box-mobile-app && npm test -- --run src/effects/revealEffectProxy.automation.test.ts src/utils/perfBudgetProxy.automation.test.ts src/test/fullCatalogAutomation.test.ts
cd mystery-box-backend && mvn "-Dtest=PaymentNotifyRealServiceParameterizedTest,MarketplaceBuyGateParameterizedTest,RefundPaidAfterCancelGateParameterizedTest,MarketplaceCoolingJobTest,OrderStatusActionMatrixTest,PaymentNotifyDecisionMatrixTest,PaymentMockProductionGuardTest" test
```

详见 `OPTIMIZATION_R2.md`。
