# 暂无法充分自动化的用例清单

> 生成时间：优化后重分类

当前 **MANUAL = 0**。

原视听/性能/mockPay 条目已降级为：
- `revealEffectProxy.automation.test.ts`（相位加速 / 设置正交 / 全特效策略代理）
- `perfBudgetProxy.automation.test.ts`（性能预算常量门禁）
- `PaymentMockProductionGuardTest`（生产关闭 mockPay）

说明：代理断言覆盖「策略与配置正确性」，不替代真机 FPS 实验室与真实支付证书联调；那些仍建议在发布前做专项验收，但不阻塞自动化绿通。
