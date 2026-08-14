# 目录 Runner → 真实测试映射（Round 4）

> 生成：2026-08-14T16:35:14.036Z

本表说明：分类器里的 runner **不保证** 每条 CSV 都有 1:1 测试方法；真测以右侧 suites 为准。

| runner | catalog rows | depth | real suites |
|---|---:|---|---|
| `junit-api` | 2580 | catalog-contract-or-api-mock | `execute-all-cases.js (contract-proxy)`, `(expand MockMvc as needed)` |
| `junit-it` | 1341 | spring-or-jdbc-it | `PrizeStockServiceSpringIntegrationTest`, `PaymentNotifyLogJdbcIT`, `MarketplaceCoolingQueryJdbcIT`, `MarketplaceSettleClaimJdbcIT`, `RefundStuckQueryJdbcIT`, `AbstractMysqlRedisSpringBootIT` |
| `unit-security` | 1148 | catalog-contract-or-security-unit | `execute-all-cases.js auth-security handlers` |
| `junit-money` | 729 | mockito-real-service | `PaymentNotifyRealServiceParameterizedTest`, `MarketplaceBuyGateParameterizedTest`, `RefundPaidAfterCancelGateParameterizedTest`, `RefundReconciliationJobParameterizedTest`, `MysteryBoxOrderServicePaymentNotifyTest`, `MysteryBoxOrderServiceRefundTest`, `MarketplaceServiceTest`, `OrderStatusActionMatrixTest`, `PaymentNotifyDecisionMatrixTest`, `PaymentMockProductionGuardTest` |
| `maestro-or-job-it` | 450 | job-mockito-or-maestro | `MarketplaceCoolingJobTest`, `RefundReconciliationJobTest`, `RefundReconciliationJobParameterizedTest` |
| `unit` | 337 | catalog-or-unit | `execute-all-cases.js executor-logic / matrices` |
| `vitest-effects` | 200 | vitest-logic | `revealSkipPolicy.automation.test.ts`, `marketplaceProceeds.automation.test.ts` |
| `maestro-or-playwright` | 89 | maestro-inventory-or-device | `.maestro/flows/*-smoke.yaml`, `scripts/maestro-ci-smoke.sh` |
| `vitest-proxy` | 39 | vitest-proxy | `revealEffectProxy.automation.test.ts`, `perfBudgetProxy.automation.test.ts`, `fullCatalogAutomation.test.ts` |

## 资金真测优先清单

- PaymentNotifyRealServiceParameterizedTest
- MarketplaceBuyGateParameterizedTest
- RefundPaidAfterCancelGateParameterizedTest
- RefundReconciliationJobParameterizedTest
- MysteryBoxOrderServicePaymentNotifyTest
- MysteryBoxOrderServiceRefundTest
- MarketplaceServiceTest
- OrderStatusActionMatrixTest
- PaymentNotifyDecisionMatrixTest
- PaymentMockProductionGuardTest

## IT / JDBC

- PrizeStockServiceSpringIntegrationTest
- PaymentNotifyLogJdbcIT
- MarketplaceCoolingQueryJdbcIT
- MarketplaceSettleClaimJdbcIT
- RefundStuckQueryJdbcIT
- AbstractMysqlRedisSpringBootIT
