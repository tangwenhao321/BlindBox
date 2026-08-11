# 开箱音效（按特效主题分包）

每套主题独立 `charge / general / hidden / legendary / ambient`，情绪偏激情、勾人：

| 目录 | 对应特效 | 情绪 |
|------|----------|------|
| `classic/` | 经典 / 设置 classic | 心跳蓄力 → 清脆连音 → 号角 |
| `cyberpunk/` | neon / cyberpunk | 合成器过载、故障、重低音 drop |
| `asmr/` | cute / asmr / minimal | 呼吸心跳、纸感、亲密暖音 |
| `party/` | luxury / party | 迪斯科脉冲、彩纸爆破、欢呼 |
| `adventure/` | default / adventure | 罗盘悬疑、开箱金属、史诗铜管 |

`ambient.wav` 为可无缝循环的低音量氛围床（约 4s soft pad/drone）。根目录 `general.wav` 等为 classic 兼容副本。

重新生成：

```bash
npm run generate:sounds
```
