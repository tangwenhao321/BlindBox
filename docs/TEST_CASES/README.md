# 测试用例包（黑盒 / 白盒）

| 指标 | 数量 |
|---|---:|
| 功能点 | 229 |
| 黑盒用例 | 4988 |
| 白盒用例 | 372 |
| P0 黑盒 | 3092 |

## 目录

- `BLACKBOX/ALL_BLACKBOX_CASES.csv` — 全量黑盒
- `BLACKBOX/<模块>.csv` — 分模块
- `WHITEBOX/ALL_WHITEBOX_CASES.csv` — 全量白盒
- `00-FUNCTION-COVERAGE.md` — 功能点矩阵与方法论说明
- `P0_SMOKE.md` — P0 冒烟子集
- `_generate_thousands.js` — 生成脚本（可继续加功能点后重跑）

## 与「几千条」的关系

当前黑盒约 **4988** 条，来自 **229** 个功能点 × 标准展开（鉴权/边界/等价类等）。
若把「每个接口 × 每个字段 × 每种组合 × 每种状态」做全笛卡尔积，理论上可到数万；那会严重冗余且不可维护。
本包策略：**功能点全覆盖 + 每点充分展开 + 资金域白盒条件覆盖**；用 JaCoCo 缺口再补白盒。

## 再生

```bash
node docs/TEST_CASES/_generate_thousands.js
```
