/**
 * 生成开箱音效 WAV（纯 Node，无第三方依赖）
 * 运行: node scripts/generateRevealSounds.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "../src/assets/sounds");

const PRESETS = {
  general: { duration: 0.22, freqs: [523, 659], volume: 0.28 },
  hidden: { duration: 0.38, freqs: [440, 554, 659], volume: 0.32 },
  legendary: { duration: 0.55, freqs: [392, 494, 587, 784], volume: 0.35 },
  charge: { duration: 0.42, freqs: [220, 277, 330, 415], volume: 0.22 },
};

function writeWav(filePath, { duration, freqs, volume, sampleRate = 44100 }) {
  const numSamples = Math.floor(sampleRate * duration);
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;
    for (const f of freqs) {
      sample += Math.sin(2 * Math.PI * f * t);
    }
    sample /= freqs.length;
    const attack = Math.min(1, t * 40);
    const decay = Math.exp(-t * (4 + freqs.length * 0.5));
    sample *= attack * decay * volume;
    const int16 = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
    buffer.writeInt16LE(int16, 44 + i * 2);
  }

  fs.writeFileSync(filePath, buffer);
}

fs.mkdirSync(outDir, { recursive: true });
for (const [name, preset] of Object.entries(PRESETS)) {
  const file = path.join(outDir, `${name}.wav`);
  writeWav(file, preset);
  console.log("wrote", file);
}
