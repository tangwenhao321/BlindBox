# 开箱音效

已内置程序化生成的 WAV（三档品质不同音高）：

- `general.wav` — 普通款短促双音
- `hidden.wav` — 隐藏款三连音
- `legendary.wav` — 传说款四连音上扬

重新生成：

```bash
npm run generate:sounds
```

也可自行替换为 MP3，并在 `effects/sound.ts` 中改 `require` 路径。
