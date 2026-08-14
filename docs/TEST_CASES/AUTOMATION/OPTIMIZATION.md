# 全量优化说明（测试与质量基建）

> 2026-08-15（含 Round 5）

## Round 5 要点

- VNPay/MoMo 网关可测签名与 fail-closed（无沙箱密钥）
- Pity `shouldForceHigh` + notify/buy controller 委托
- JaCoCo 资金包 **12%**；FPS fixture；Maestro 含 refunds smoke

详见 `OPTIMIZATION_R5.md`。历史 R2–R4 文档仍保留。

## 诚实边界

目录 PASS ≠ 真网关/真机；映射见 `REAL_TEST_MAPPING.md`。
