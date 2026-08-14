# 全量优化 Round 2

> 2026-08-15

## 新增

1. **真实 Service 参数化**
   - `PaymentNotifyRealServiceParameterizedTest`（VNPay 幂等、微信金额门、MoMo 签名门）
   - `MarketplaceBuyGateParameterizedTest`（非 ON_SALE、信用门槛、自购）
   - `RefundPaidAfterCancelGateParameterizedTest`（取消后到账状态门）
   - `MarketplaceCoolingJobTest` 批量 settle

2. **Testcontainers SQL IT**
   - `MarketplaceCoolingQueryJdbcIT`（冷却到期查询；`disabledWithoutDocker`，无 Docker/镜像时跳过）

3. **JaCoCo check**
   - `mvn verify` 时 BUNDLE 行覆盖 soft floor 5%（可随资金测增长上调）

4. **Maestro PR smoke 扩列**
   - mock-pay / marketplace / checkout / fairness / settings-reveal

5. **性能实验室入口**
   - `scripts/perf-lab-gate.sh` + `collect-reveal-fps.mjs` stub

6. **CI catalog-automation**
   - 接入资金参数化 Maven 套件 + perf lab gate

## 回归

- 目录执行：6913/6913 PASS
- Vitest 代理 + catalog gate：PASS
- 资金参数化 Mockito：PASS
- JDBC IT：本机 Docker Hub 不可达时自动 skip（CI 有 Docker 时跑）
