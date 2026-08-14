# 分层覆盖报告（Round 3）

- 生成：2026-08-14T16:35:14.312Z
- 目录总量：6913（PASS 6913 / FAIL 0 / SKIP 0）

## byDepth

```json
{
  "contract-proxy": 3955,
  "it-spec-contract": 1341,
  "e2e-spec-contract": 539,
  "executor-logic": 1078
}
```

## byTier

```json
{
  "AUTO_UNIT": 5033,
  "AUTO_IT": 1341,
  "AUTO_E2E": 539
}
```

## byRunner

```json
{
  "junit-api": 2580,
  "unit-security": 1148,
  "unit": 337,
  "junit-it": 1341,
  "junit-money": 729,
  "maestro-or-job-it": 450,
  "vitest-proxy": 39,
  "vitest-effects": 200,
  "maestro-or-playwright": 89
}
```

## 真测补强（目录外）

- Mockito 真实 Service：支付回调 / 市集门禁 / 退款状态门 / 退款对账 Job
- JDBC Testcontainers：notify 幂等、冷却查询、退款 stuck 查询
- Spring IT：PrizeStock 扣减与耗尽
- Maestro：inventory gate（设备跑需 MAESTRO_RUN_DEVICE=1）
- JaCoCo：资金包 BUNDLE 行覆盖 soft floor 12%
