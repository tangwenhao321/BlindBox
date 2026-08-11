/**
 * Generate passionate, theme-specific reveal SFX (pure Node, no deps).
 * Run: node scripts/generateRevealSounds.mjs
 *
 * Packs:
 * - classic: clean chime / fanfare
 * - cyberpunk: harsh synth, glitch, bass drop
 * - asmr: soft paper / breath / intimate tones
 * - party: confetti blast, cheer-like bursts
 * - adventure: treasure unlock, brass / mystery swell
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "../src/assets/sounds");

const SAMPLE_RATE = 44100;

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function env(t, attack, decay) {
  return Math.min(1, t * attack) * Math.exp(-t * decay);
}

function tone(t, freq, vol = 1) {
  return Math.sin(2 * Math.PI * freq * t) * vol;
}

function saw(t, freq, vol = 1) {
  const phase = (t * freq) % 1;
  return (2 * phase - 1) * vol;
}

function noise(seed) {
  // Deterministic-ish noise from sin hash
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

function writeWav(filePath, samples) {
  const numSamples = samples.length;
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < numSamples; i++) {
    const int16 = Math.max(-32768, Math.min(32767, Math.floor(samples[i] * 32767)));
    buffer.writeInt16LE(int16, 44 + i * 2);
  }
  fs.writeFileSync(filePath, buffer);
}

function render(durationSec, fn) {
  const n = Math.floor(SAMPLE_RATE * durationSec);
  const out = new Float64Array(n);
  let peak = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const s = fn(t, i);
    out[i] = s;
    peak = Math.max(peak, Math.abs(s));
  }
  const norm = peak > 0 ? 0.97 / peak : 1;
  for (let i = 0; i < n; i++) out[i] *= norm;
  return out;
}

/**
 * Soft edge crossfade so ambient beds loop without a click.
 * Frequencies should complete integer cycles within AMBIENT_DURATION_SEC.
 */
const AMBIENT_DURATION_SEC = 4;
const AMBIENT_CROSSFADE_SEC = 0.12;

function makeLoopable(samples, fadeSec = AMBIENT_CROSSFADE_SEC) {
  const fade = Math.min(samples.length >> 1, Math.floor(SAMPLE_RATE * fadeSec));
  if (fade <= 0) return samples;
  const out = samples.slice();
  for (let i = 0; i < fade; i++) {
    const t = i / fade;
    const start = samples[i];
    const end = samples[samples.length - fade + i];
    out[i] = end * (1 - t) + start * t;
  }
  return out;
}

function renderAmbient(fn) {
  return makeLoopable(render(AMBIENT_DURATION_SEC, fn));
}

/** Theme synthesizers: return { charge, general, hidden, legendary, ambient } sample arrays */
const THEMES = {
  classic: {
    charge: () =>
      render(0.85, (t) => {
        // Rising heartbeat / tension
        const bpm = 60 + 70 * Math.min(1, t / 0.85);
        const pulse = Math.sin(2 * Math.PI * (bpm / 60) * t);
        const thump = Math.max(0, pulse) ** 3;
        const swell = tone(t, 110 + t * 180, 0.35) * env(t, 8, 1.2);
        return thump * 0.55 + swell + tone(t, 330 + t * 220, 0.18) * env(t, 6, 2);
      }),
    general: () =>
      render(0.35, (t) => {
        return (
          tone(t, 659, 0.55) * env(t, 80, 8) +
          tone(t, 988, 0.35) * env(t, 60, 10) +
          tone(t, 1319, 0.2) * env(Math.max(0, t - 0.08), 80, 12)
        );
      }),
    hidden: () =>
      render(0.55, (t) => {
        const a = tone(t, 523, 0.4) * env(t, 50, 5);
        const b = tone(t, 659, 0.45) * env(Math.max(0, t - 0.1), 50, 5);
        const c = tone(t, 784, 0.5) * env(Math.max(0, t - 0.2), 50, 4.5);
        const sparkle = tone(t, 1568, 0.18) * env(Math.max(0, t - 0.28), 40, 8);
        return a + b + c + sparkle;
      }),
    legendary: () =>
      render(1.05, (t) => {
        // Passionate ascending fanfare
        const steps = [392, 494, 587, 740, 988];
        let s = 0;
        steps.forEach((f, i) => {
          const start = i * 0.12;
          s += tone(t, f, 0.42) * env(Math.max(0, t - start), 70, 3.5);
          s += tone(t, f * 2, 0.15) * env(Math.max(0, t - start), 50, 5);
        });
        s += saw(t, 98, 0.12) * env(t, 4, 1.5);
        return s;
      }),
    // Warm fifth pad — 110/165/220 Hz complete integer cycles over 4s
    ambient: () =>
      renderAmbient((t) => {
        const breathe = 0.82 + 0.18 * Math.sin(2 * Math.PI * 0.25 * t);
        return (
          (tone(t, 110, 0.28) + tone(t, 165, 0.16) + tone(t, 220, 0.1)) * breathe * 0.32
        );
      }),
  },

  cyberpunk: {
    charge: () =>
      render(1.0, (t) => {
        // Glitchy energy overload
        const base = saw(t, 55 + t * 90, 0.35) * env(t, 10, 0.8);
        const buzz = saw(t, 220 + Math.sin(t * 40) * 40, 0.25) * env(t, 8, 1);
        const glitch = noise(t * 9000) * (Math.sin(t * 55) > 0.7 ? 0.35 : 0.05) * env(t, 20, 1.2);
        const rise = tone(t, 880 * Math.min(2.2, 0.6 + t * 1.8), 0.22) * env(t, 5, 1.5);
        return base + buzz + glitch + rise;
      }),
    general: () =>
      render(0.4, (t) => {
        return (
          saw(t, 440, 0.4) * env(t, 90, 9) +
          tone(t, 880, 0.35) * env(t, 70, 10) +
          noise(t * 4000) * 0.12 * env(t, 100, 20)
        );
      }),
    hidden: () =>
      render(0.7, (t) => {
        const drop = saw(t, Math.max(40, 180 - t * 220), 0.45) * env(t, 30, 2.2);
        const arp =
          tone(t, 660 + ((Math.floor(t * 12) % 4) * 110), 0.35) * env(t, 40, 3.5);
        const zap = noise(t * 12000) * 0.2 * env(Math.max(0, t - 0.25), 80, 15);
        return drop + arp + zap;
      }),
    legendary: () =>
      render(1.25, (t) => {
        // Aggressive synthwave drop + neon scream
        const kick = Math.exp(-t * 18) * Math.sin(2 * Math.PI * (80 + t * 40) * t) * 0.7;
        const bass = saw(t, 55, 0.4) * env(t, 8, 1.1);
        const lead = saw(t, 330 + t * 260, 0.35) * env(t, 6, 1.3);
        const scream = tone(t, 1760, 0.25) * env(Math.max(0, t - 0.35), 40, 3);
        const grit = noise(t * 8000) * 0.15 * env(t, 10, 2);
        return kick + bass + lead + scream + grit;
      }),
    // Dark synth drone with gentle detune / grit
    ambient: () =>
      renderAmbient((t) => {
        const lfo = 0.78 + 0.22 * Math.sin(2 * Math.PI * 0.5 * t);
        const grit = noise(t * 1800) * 0.04;
        return (
          (saw(t, 55, 0.18) + tone(t, 110, 0.2) + tone(t, 164.5, 0.1) + grit) * lfo * 0.28
        );
      }),
  },

  asmr: {
    charge: () =>
      render(1.1, (t) => {
        // Soft breathing / fabric + intimate heartbeat
        const breath = noise(t * 700) * 0.18 * (0.5 + 0.5 * Math.sin(2 * Math.PI * 0.6 * t)) * env(t, 3, 0.6);
        const heart = Math.max(0, Math.sin(2 * Math.PI * 1.15 * t)) ** 8 * 0.45;
        const soft = tone(t, 196 + t * 40, 0.2) * env(t, 4, 0.9);
        return breath + heart + soft;
      }),
    general: () =>
      render(0.45, (t) => {
        // Soft chime + paper rustle
        const chime = tone(t, 784, 0.35) * env(t, 40, 6) + tone(t, 1175, 0.22) * env(t, 30, 8);
        const paper = noise(t * 3000) * 0.1 * env(t, 50, 12);
        return chime + paper;
      }),
    hidden: () =>
      render(0.75, (t) => {
        // Flower bloom / soft tear
        const tear = noise(t * 5000) * 0.16 * env(t, 25, 4);
        const bloom =
          tone(t, 523, 0.28) * env(t, 8, 2.2) +
          tone(t, 659, 0.3) * env(Math.max(0, t - 0.15), 8, 2) +
          tone(t, 784, 0.32) * env(Math.max(0, t - 0.3), 8, 1.8);
        const air = noise(t * 900) * 0.08 * env(t, 3, 1);
        return tear + bloom + air;
      }),
    legendary: () =>
      render(1.2, (t) => {
        // Warm intimate reveal — piano-like + whisper noise
        const notes = [523, 659, 784, 988, 1175];
        let s = noise(t * 1100) * 0.07 * env(t, 2, 0.7);
        notes.forEach((f, i) => {
          const start = 0.08 + i * 0.14;
          s += tone(t, f, 0.38) * env(Math.max(0, t - start), 20, 2.4);
          s += tone(t, f * 2.01, 0.1) * env(Math.max(0, t - start), 15, 3);
        });
        return s;
      }),
    // Soft breath bed + intimate low pad
    ambient: () =>
      renderAmbient((t) => {
        const breath =
          noise(t * 620) * 0.1 * (0.55 + 0.45 * Math.sin(2 * Math.PI * 0.25 * t));
        const pad = tone(t, 98, 0.18) + tone(t, 147, 0.12) + tone(t, 196, 0.07);
        return (pad * 0.55 + breath) * 0.3;
      }),
  },

  party: {
    charge: () =>
      render(0.9, (t) => {
        // Disco pulse + rising cheer energy
        const beat = Math.max(0, Math.sin(2 * Math.PI * 4 * t)) ** 4 * 0.5;
        const whoosh = noise(t * 2000) * 0.2 * env(t, 6, 1.5);
        const rise = tone(t, 220 + t * 500, 0.3) * env(t, 5, 1.2);
        return beat + whoosh + rise;
      }),
    general: () =>
      render(0.4, (t) => {
        return (
          tone(t, 880, 0.45) * env(t, 90, 9) +
          tone(t, 1320, 0.3) * env(t, 70, 11) +
          noise(t * 6000) * 0.15 * env(t, 100, 25)
        );
      }),
    hidden: () =>
      render(0.65, (t) => {
        // Confetti pop cluster
        let s = 0;
        for (let k = 0; k < 6; k++) {
          const start = k * 0.05;
          const f = 700 + k * 160;
          s += tone(t, f, 0.28) * env(Math.max(0, t - start), 120, 14);
          s += noise((t + k) * 9000) * 0.12 * env(Math.max(0, t - start), 100, 18);
        }
        return s;
      }),
    legendary: () =>
      render(1.3, (t) => {
        // Explosive celebration — brass + crowd-ish noise bed
        const blast = noise(t * 4000) * 0.35 * env(t, 80, 3.5);
        const brass = [262, 330, 392, 523, 659].reduce((acc, f, i) => {
          return acc + tone(t, f, 0.32) * env(Math.max(0, t - i * 0.08), 40, 2.2);
        }, 0);
        const cheer = noise(t * 1500) * 0.22 * (0.4 + 0.6 * Math.sin(2 * Math.PI * 6 * t)) * env(t, 5, 0.9);
        const coin = tone(t, 1760, 0.2) * env(Math.max(0, t - 0.4), 60, 6);
        return blast + brass + cheer + coin;
      }),
    // Soft disco pulse pad (1 Hz swell over 4s = 4 cycles)
    ambient: () =>
      renderAmbient((t) => {
        const pulse = 0.7 + 0.3 * Math.max(0, Math.sin(2 * Math.PI * 1 * t));
        const pad = tone(t, 130.8125, 0.16) + tone(t, 196.21875, 0.12) + tone(t, 261.625, 0.08);
        return pad * pulse * 0.28;
      }),
  },

  adventure: {
    charge: () =>
      render(1.05, (t) => {
        // Compass spin / mystery — low strings + ticking
        const tick = ((Math.floor(t * 10) % 2) === 0 ? 1 : 0) * tone(t, 880, 0.15) * env(t % 0.1, 200, 40);
        const drone = tone(t, 98, 0.3) * env(t, 3, 0.7) + tone(t, 147, 0.18) * env(t, 3, 0.8);
        const swell = tone(t, 196 + t * 80, 0.28) * env(t, 4, 1);
        return tick + drone + swell;
      }),
    general: () =>
      render(0.42, (t) => {
        return (
          tone(t, 494, 0.4) * env(t, 60, 7) +
          tone(t, 740, 0.32) * env(Math.max(0, t - 0.06), 60, 8) +
          tone(t, 988, 0.2) * env(Math.max(0, t - 0.12), 50, 10)
        );
      }),
    hidden: () =>
      render(0.7, (t) => {
        // Treasure chest unlock — metallic clicks + gold shimmer
        const click =
          noise(t * 10000) * 0.25 * env(t, 150, 20) +
          noise((t - 0.12) * 10000) * 0.2 * env(Math.max(0, t - 0.12), 150, 20);
        const gold =
          tone(t, 587, 0.35) * env(Math.max(0, t - 0.2), 20, 3) +
          tone(t, 880, 0.3) * env(Math.max(0, t - 0.32), 20, 3) +
          tone(t, 1175, 0.25) * env(Math.max(0, t - 0.44), 20, 3.5);
        return click + gold;
      }),
    legendary: () =>
      render(1.35, (t) => {
        // Epic reveal — brass + choir-ish stacked fifths
        const motif = [196, 247, 294, 370, 494, 740];
        let s = saw(t, 65, 0.15) * env(t, 3, 0.9);
        motif.forEach((f, i) => {
          const start = i * 0.11;
          s += tone(t, f, 0.36) * env(Math.max(0, t - start), 25, 2);
          s += tone(t, f * 1.5, 0.14) * env(Math.max(0, t - start), 20, 2.5);
        });
        s += tone(t, 988, 0.22) * env(Math.max(0, t - 0.75), 15, 2);
        return s;
      }),
    // Mysterious low-string drone
    ambient: () =>
      renderAmbient((t) => {
        const swell = 0.8 + 0.2 * Math.sin(2 * Math.PI * 0.25 * t);
        return (
          (tone(t, 73.5, 0.2) + tone(t, 98, 0.18) + tone(t, 147, 0.1) + saw(t, 49, 0.06)) *
          swell *
          0.3
        );
      }),
  },
};

fs.mkdirSync(outDir, { recursive: true });

// Legacy flat files (classic) for backward compatibility
for (const [key, fn] of Object.entries(THEMES.classic)) {
  const file = path.join(outDir, `${key}.wav`);
  writeWav(file, fn());
  console.log("wrote", file);
}

// Per-theme packs
for (const [theme, banks] of Object.entries(THEMES)) {
  const themeDir = path.join(outDir, theme);
  fs.mkdirSync(themeDir, { recursive: true });
  for (const [key, fn] of Object.entries(banks)) {
    const file = path.join(themeDir, `${key}.wav`);
    writeWav(file, fn());
    console.log("wrote", file);
  }
}

console.log("Done. Theme packs:", Object.keys(THEMES).join(", "));
