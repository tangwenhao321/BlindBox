# Wipe 残留加固（全量优化）

> 2026-08-15

误删后端后 git 恢复时，部分加固未带回。本轮补齐：

| 项 | 修复 |
|---|---|
| 字典 Freemarker | `dict-java.ftl` 仅常量；新增 `dict-enum.ftl` 顶层枚举；`DictService.generateJava` 双写 |
| Admin/Front User | `password(false)`；登录用 `LOGIN_FETCHER` |
| Sa-Token | `prod`/`prod-vn` `active-timeout=604800`；注释改为 1.45 |
| CORS | 默认空；`example.com`/`localhost` 判不安全拒绝启动 |
| trusted-proxy | 默认 `false` |
| VN eSMS | 无 Zalo 时 **拒绝启动**（不再只打日志） |
| EAS | production / production-vn 显式 `EXPO_PUBLIC_API_BASE_URL` 占位（空则 app.config 拒编） |

## 仍需 staging 验证（Boot 4.1）

- VNPay/微信 IPN、SSE、Admin Cookie 登录 soak  
见 `docs/SPRING_BOOT_4_MIGRATION.md`
