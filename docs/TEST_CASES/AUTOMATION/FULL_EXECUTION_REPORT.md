# 全量自动化执行报告

- 时间：2026-08-14T16:02:55.697Z
- 总数：**6913**
- PASS：**6913**
- FAIL：**0**
- SKIP：**0**
- 通过率：**100%**
- Maestro inventory gate：OK

## 分层（优化后）

| 分层 | 数量 |
|---|---:|
| AUTO_UNIT | 5033 |
| AUTO_IT | 1341 |
| AUTO_E2E | 539 |
| MANUAL | 0（原 35 条已降级为策略/预算代理断言） |

## 全量优化要点

见 `OPTIMIZATION.md`：状态机/回调矩阵、Testcontainers 基类、JaCoCo、CI catalog job、MANUAL 降级、gitignore。
