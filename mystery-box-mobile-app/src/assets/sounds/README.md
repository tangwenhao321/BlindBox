# 开箱音效（按特效主题分包）

每套主题独立 `charge / general / hidden / legendary / ambient`，采样来自 Kenney / OpenGameArt CC0 包（见 `src/assets/ATTRIBUTION.md`）：

| 目录 | 对应特效 | 情绪 |
|------|----------|------|
| `classic/` | 经典 / 设置 classic | 金属 tick 蓄力 → 确认音 → HIT 短句 |
| `cyberpunk/` | neon / cyberpunk | NES 氛围、故障循环、电子开合 |
| `asmr/` | cute / asmr / minimal | 翻书循环、布料、气泡 |
| `party/` | luxury / party | 披萨/萨克斯短句、金币、挥击礼花 |
| `adventure/` | default / adventure | 钢弦氛围、门闩、开门、木响 |

`ambient.wav` 为约 8s 可循环氛围床。根目录 `general.wav` 等为 classic 兼容副本。

`stings/` 为分镜一拍音效（罗盘/故障/翻书/礼花）。

重新导入真实采样：

```bash
node scripts/importRoyaltyFreeSounds.mjs
```

仅在需要回到合成占位音时：

```bash
FORCE_GENERATE_SOUNDS=1 npm run generate:sounds
```
