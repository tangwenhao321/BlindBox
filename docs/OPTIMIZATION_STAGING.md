# 全量优化 — Staging 就绪

> 2026-08-16

## 交付

1. `docs/STAGING_SOAK.md` — Boot 4.1 浸泡清单（探针 + 手动 IPN/SSE）
2. `scripts/staging-soak.ps1` / `staging-soak.sh` — 无密钥可跑探针；设 `STAGING_BASE_URL` 打真实 staging
3. `release-preflight.ps1` — 校验 wipe 残留（dict/password/active-timeout）与 soak 文档
4. CI catalog — 扩安全/IAP 单测 + invite/attest Vitest + soak 脚本 doc 模式
5. JaCoCo 资金包 soft floor **13%**

## 用法

```powershell
.\scripts\release-preflight.ps1
.\scripts\staging-soak.ps1   # 无 URL 时仅检查文档
$env:STAGING_BASE_URL="https://your-staging"; .\scripts\staging-soak.ps1
```

## 仍需人工

真 VNPay/微信 IPN、带 token 的 SSE、Admin 同域 Cookie — 见 soak 文档 exit criteria。
