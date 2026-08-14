# 全量优化 Round 5

> 2026-08-15

## 交付（无沙箱密钥 / 无真机）

1. **VNPay** — 签名篡改/错密钥 + `VNPayPaymentGatewayParseTest`（成功/非 00/坏签/空参/金额）
2. **MoMo** — notify fail-closed + `matchesPayAmount` VND 主单位
3. **Pity** — `shouldForceHigh` 达阈值 / 未达阈值
4. **Controller** — VNPay/MoMo notify 委托；市集 `buy` 守卫 + 委托（MockStatic StpUtil）
5. **Maestro** — PR smoke 增加 `refunds-smoke.yaml`
6. **FPS** — fixture 门禁进 `perf-lab-gate.sh`
7. **JaCoCo** — 资金包 soft floor **12%**

## 仍需真实环境

- Partner/微信沙箱联调、CI emulator Maestro、完整 Spring notify→开盒 IT
