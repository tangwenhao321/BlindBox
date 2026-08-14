# 自动化执行映射

| 分层 | 数量 | 如何跑 |
|---|---:|---|
| AUTO_UNIT | 4995 | 后端 `mvn test` + 移动端 `npm test` + 管理端 `npm test` |
| AUTO_IT | 1343 | `mvn test`（需 Docker/本地 MySQL+Redis；不可用则 skip） |
| AUTO_E2E | 540 | Maestro `validate:maestro`；有设备时 `test:e2e`；管理端 Playwright smoke |
| MANUAL | 35 | 见 `MANUAL_CASES.md` |

## 关键已落地自动化增强

- 移动端：`revealSkipPolicy` 全判定表、加速倍率、旅程覆盖映射单测
- 后端：市集手续费边界、资金域既有 Mockito 套件
- 脚本：`docs/TEST_CASES/AUTOMATION/run-automation.ps1`

## 再生分类

```bash
node docs/TEST_CASES/AUTOMATION/classify-cases.js
```
