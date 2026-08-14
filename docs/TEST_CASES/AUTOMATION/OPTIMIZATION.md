# 全量优化说明（测试与质量基建）

> 2026-08-15

## 已落地

1. **资金/状态机参数化**
   - `OrderStatusActionMatrixTest`
   - `PaymentNotifyDecisionMatrixTest`
   - `PaymentMockProductionGuardTest`
   - 市集手续费边界（既有 `MarketplaceServiceTest` 增强）

2. **Testcontainers 基类**
   - `AbstractMysqlRedisSpringBootIT`
   - `PrizeStockServiceSpringIntegrationTest` 改为继承基类

3. **JaCoCo**
   - `mystery-box-backend/pom.xml` 接入 prepare-agent + report
   - CI 上传 `backend-jacoco` artifact

4. **CI**
   - 新增 `catalog-automation` job：全量用例执行 + 策略/代理 Vitest + Admin Vitest

5. **MANUAL 降级**
   - 相位长按加速、设置正交、单抽全特效、性能预算、mockPay 生产守卫 → 代理自动化
   - 分类器优先降级为 `AUTO_UNIT`（`vitest-proxy`）

6. **工程卫生**
   - `.gitignore`：`*.tsbuildinfo`、`compile.out`、`dc-raw.java`

## 再生 / 回归

```bash
node docs/TEST_CASES/AUTOMATION/classify-cases.js
node docs/TEST_CASES/AUTOMATION/execute-all-cases.js
cd mystery-box-mobile-app && npm test -- --run src/effects/revealEffectProxy.automation.test.ts src/utils/perfBudgetProxy.automation.test.ts src/test/fullCatalogAutomation.test.ts
cd mystery-box-backend && mvn "-Dtest=OrderStatusActionMatrixTest,PaymentNotifyDecisionMatrixTest,PaymentMockProductionGuardTest,MarketplaceServiceTest" test
```
