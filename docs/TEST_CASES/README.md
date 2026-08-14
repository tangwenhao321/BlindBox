# 测试用例包（黑盒 / 白盒）

| 指标 | 数量 |
|---|---:|
| 黑盒全量 | 6913 |
| 白盒全量 | 1248 |
| 可自动 UNIT | 4995 |
| 可自动 IT | 1343 |
| 可自动 E2E | 540 |
| 暂人工 MANUAL | 35 |

链路索引：`JOURNEY_SCENARIOS.md`；开盒市集：`DRAW_MARKETPLACE_COVERAGE.md`；高价值：`HIGH_VALUE_PRIORITY.md`。

## 自动化

- 分类目录：`AUTOMATION/CASE_AUTOMATION_CATALOG.csv`
- 人工残留：`AUTOMATION/MANUAL_CASES.md`
- 回归报告：`AUTOMATION/REGRESSION_REPORT.md`
- 批量执行：`pwsh docs/TEST_CASES/AUTOMATION/run-automation.ps1`

## 再生

```bash
node docs/TEST_CASES/_generate_journey_scenarios.js
node docs/TEST_CASES/AUTOMATION/classify-cases.js
```
