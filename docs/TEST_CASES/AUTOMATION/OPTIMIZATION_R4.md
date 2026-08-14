# 全量优化 Round 4

> 2026-08-15

## 交付

1. **市集 settle CAS JDBC IT** — `MarketplaceSettleClaimJdbcIT`（认领互斥 + SETTLING 回滚重试）
2. **库存并发 IT** — `PrizeStockServiceSpringIntegrationTest#concurrentDrawDoesNotOversell`（8 线程 / 库存 5，不超卖）
3. **JaCoCo 硬门禁** — 资金包 soft→**10%**，CI 去掉 `continue-on-error`
4. **目录真测映射** — `map-runner-to-real-tests.js` → `REAL_TEST_MAPPING.md`
5. **Maestro** — catalog job 跑 inventory；`MAESTRO_DEVICE.md` 说明真机可选开启

## 仍未做（需沙箱/farm）

- 微信/VNPay/MoMo 沙箱联调
- CI 默认 Android emulator Maestro
- 支付回调完整 SpringBoot 端到端（依赖 Flyway 全库 + 大量 Bean）
