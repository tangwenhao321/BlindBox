# 全量自动化执行报告

- 时间：2026-08-14T16:35:14.312Z
- 总数：6913
- PASS：6913
- FAIL：0
- SKIP：0
- 通过率：100%
- Maestro inventory gate：OK (39 flows)

## 分层深度（防误解）

| depth | count | 含义 |
|---|---:|---|
| executor-logic | 1078 | 执行器内真实逻辑断言（跳过/手续费/状态机） |
| contract-proxy | 3955 | 规格契约/代理断言 |
| e2e-spec-contract | 539 | E2E 规格契约（非真机） |
| it-spec-contract | 1341 | IT 规格契约（非 Spring IT） |
| other | 0 | 其他 |

> PASS includes contract-proxy/e2e-spec/it-spec rows; not equivalent to live gateway or device E2E. See LAYERED_COVERAGE_REPORT.md.

