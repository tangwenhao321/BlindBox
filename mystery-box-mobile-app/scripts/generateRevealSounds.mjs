/**
 * Generate reveal SFX (pure Node, no deps).
 * Run: node scripts/generateRevealSounds.mjs
 *
 * Classic / adventure: fate ostinato (Dies Irae-like D–C–D–Bb), heartbeat,
 * choir pad, timpani — epic, fatalistic, slightly hypnotic.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "../src/assets/sounds");

const SAMPLE_RATE = 44100;

/** Fate hook in Hz: D3 C3 D3 Bb2 — the "destiny" earworm. */
const FATE = [146.83, 130.81, 146.83, 116.54];
const FATE_LOW = [73.42, 65.41, 73.42, 58.27];

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
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

function sat(x) {
  return Math.tanh(x);
}

/** Detuned choir / organ — reads as fate, not a toy beep. */
function choir(t, freq, vol = 1) {
  return (
    tone(t, freq, vol) +
    tone(t, freq * 1.003, vol * 0.62) +
    tone(t, freq * 0.997, vol * 0.4) +
    tone(t, freq * 0.5, vol * 0.42) +
    tone(t, freq * 1.5, vol * 0.18) +
    tone(t, freq * 2.0, vol * 0.08)
  );
}

function brass(t, freq, vol = 1) {
  return (
    saw(t, freq, vol * 0.55) +
    tone(t, freq, vol * 0.7) +
    tone(t, freq * 2.01, vol * 0.22) +
    saw(t, freq * 0.5, vol * 0.18)
  );
}

function timpani(t, start = 0, pitch = 68) {
  const u = Math.max(0, t - start);
  return Math.exp(-u * 6.4) * Math.sin(2 * Math.PI * (pitch + u * 32) * u) * 0.95;
}

/** Two-hit heartbeat (lub-dub) at bpm. */
function heartbeat(t, bpm, vol = 1) {
  const beatSec = 60 / bpm;
  const pos = t % beatSec;
  const dub = 0.18;
  const hit = (u, p) => {
    const x = Math.max(0, u);
    return Math.exp(-x * 28) * Math.sin(2 * Math.PI * (p - x * 40) * x);
  };
  return (hit(pos, 62) + hit(pos - dub, 48) * 0.72) * vol;
}

/** Repeating fate ostinato. noteDur in seconds. */
function ostinato(t, notes, noteDur, vol, voice = choir) {
  const i = Math.floor(t / noteDur) % notes.length;
  const u = t % noteDur;
  const f = notes[i];
  const gate = env(u, 55, 3.6 / Math.max(0.08, noteDur));
  return voice(t, f, vol) * gate;
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
  const norm = peak > 0 ? 0.96 / peak : 1;
  for (let i = 0; i < n; i++) out[i] *= norm;
  return out;
}

const AMBIENT_DURATION_SEC = 8;
const AMBIENT_CROSSFADE_SEC = 0.16;

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

function fateSting(t, start, vol = 0.4, noteDur = 0.16) {
  let s = 0;
  FATE.forEach((f, i) => {
    const u = Math.max(0, t - start - i * noteDur);
    s += choir(t, f, vol) * env(u, 28, 4.2);
    s += brass(t, f * 0.5, vol * 0.22) * env(u, 18, 3.6);
  });
  return s;
}

const THEMES = {
  classic: {
    charge: () =>
      render(2.6, (t) => {
        const rise = Math.min(1, t / 2.6);
        const bpm = 56 + 64 * rise;
        const drone = choir(t, 73.42 + rise * 8, 0.3) * (0.4 + 0.6 * rise);
        const hook = ostinato(t, FATE, 0.42, 0.28 + 0.22 * rise);
        const bass = ostinato(t, FATE_LOW, 0.42, 0.2 + 0.18 * rise, brass);
        const heart = heartbeat(t, bpm, 0.38 + 0.28 * rise);
        const air = noise(t * 420) * 0.06 * rise;
        const swell = choir(t, 110 + rise * 40, 0.16) * env(t, 1.8, 0.28);
        return sat(drone + hook + bass + heart + air + swell + timpani(t, 0, 58) * 0.4);
      }),
    general: () =>
      render(1.15, (t) => {
        return sat(
          timpani(t, 0, 70) * 0.62 +
            heartbeat(t, 72, 0.28) * env(t, 8, 2.2) +
            fateSting(t, 0.04, 0.42, 0.14) +
            choir(t, 293.66, 0.22) * env(Math.max(0, t - 0.62), 18, 3.4)
        );
      }),
    hidden: () =>
      render(1.85, (t) => {
        const mist = noise(t * 880) * 0.1 * env(t, 3, 0.85);
        return sat(
          mist +
            fateSting(t, 0.02, 0.34, 0.18) +
            choir(t, 349.23, 0.32) * env(Math.max(0, t - 0.78), 10, 1.5) +
            choir(t, 440, 0.28) * env(Math.max(0, t - 1.05), 10, 1.4) +
            tone(t, 1320, 0.1) * env(Math.max(0, t - 1.28), 12, 3)
        );
      }),
    legendary: () =>
      render(3.15, (t) => {
        let s = timpani(t, 0, 52) * 1.0 + timpani(t, 0.22, 78) * 0.55;
        s += saw(t, 36.71, 0.12) * env(t, 2, 0.45);
        s += fateSting(t, 0.08, 0.4, 0.2);
        s += fateSting(t, 0.92, 0.36, 0.18);
        s += brass(t, 146.83, 0.28) * env(Math.max(0, t - 1.7), 8, 1.15);
        s += choir(t, 293.66, 0.3) * env(Math.max(0, t - 1.95), 8, 1.05);
        s += choir(t, 440, 0.2) * env(Math.max(0, t - 2.25), 7, 1.15);
        s += choir(t, 587.33, 0.14) * env(Math.max(0, t - 2.5), 6, 1.3);
        return sat(s);
      }),
    ambient: () =>
      renderAmbient((t) => {
        const breathe = 0.82 + 0.18 * Math.sin(2 * Math.PI * 0.125 * t);
        const bpm = 58;
        return sat(
          (choir(t, 73.42, 0.2) + tone(t, 110.0, 0.08)) * breathe * 0.55 +
            ostinato(t, FATE, 0.5, 0.16) * 0.85 +
            ostinato(t, FATE_LOW, 0.5, 0.12, brass) * 0.7 +
            heartbeat(t, bpm, 0.14) * 0.55
        ) * 0.42;
      }),
  },

  cyberpunk: {
    charge: () =>
      render(1.15, (t) => {
        const hook = [55, 55, 82.5, 73.4];
        const base = ostinato(t, hook, 0.14, 0.4, saw);
        const buzz = saw(t, 220 + Math.sin(t * 40) * 40, 0.22) * env(t, 8, 1);
        const glitch = noise(t * 9000) * (Math.sin(t * 55) > 0.65 ? 0.32 : 0.05) * env(t, 20, 1.2);
        const rise = tone(t, 880 * Math.min(2.2, 0.6 + t * 1.8), 0.2) * env(t, 5, 1.5);
        return sat(base + buzz + glitch + rise);
      }),
    general: () =>
      render(0.55, (t) => {
        return sat(
          saw(t, 110, 0.35) * env(t, 80, 7) +
            ostinato(t, [440, 330, 440, 220], 0.08, 0.32) +
            noise(t * 4000) * 0.12 * env(t, 100, 20)
        );
      }),
    hidden: () =>
      render(0.8, (t) => {
        const drop = saw(t, Math.max(40, 180 - t * 220), 0.42) * env(t, 30, 2.2);
        const arp = ostinato(t, [660, 770, 880, 990], 0.07, 0.3);
        const zap = noise(t * 12000) * 0.18 * env(Math.max(0, t - 0.28), 80, 15);
        return sat(drop + arp + zap);
      }),
    legendary: () =>
      render(1.4, (t) => {
        const kick = Math.exp(-t * 16) * Math.sin(2 * Math.PI * (72 + t * 48) * t) * 0.75;
        const bass = ostinato(t, [55, 55, 82.5, 73.4], 0.12, 0.38, saw);
        const lead = saw(t, 330 + t * 240, 0.32) * env(t, 6, 1.2);
        const scream = tone(t, 1760, 0.22) * env(Math.max(0, t - 0.4), 40, 3);
        return sat(kick + bass + lead + scream + noise(t * 8000) * 0.12 * env(t, 10, 2));
      }),
    ambient: () =>
      renderAmbient((t) => {
        const lfo = 0.78 + 0.22 * Math.sin(2 * Math.PI * 0.5 * t);
        const grit = noise(t * 1800) * 0.04;
        return sat(
          (saw(t, 55, 0.16) + ostinato(t, [55, 55, 82.5, 73.4], 0.5, 0.12, saw) + grit) * lfo
        ) * 0.32;
      }),
  },

  asmr: {
    charge: () =>
      render(1.2, (t) => {
        const breath = noise(t * 700) * 0.18 * (0.5 + 0.5 * Math.sin(2 * Math.PI * 0.6 * t)) * env(t, 3, 0.6);
        const heart = heartbeat(t, 64, 0.32);
        const soft = ostinato(t, [196, 220, 247, 196], 0.28, 0.18);
        return breath + heart + soft;
      }),
    general: () =>
      render(0.55, (t) => {
        const chime = tone(t, 784, 0.32) * env(t, 40, 6) + tone(t, 1175, 0.2) * env(t, 30, 8);
        const paper = noise(t * 3000) * 0.1 * env(t, 50, 12);
        return chime + paper + ostinato(t, [523, 659, 784, 659], 0.1, 0.16);
      }),
    hidden: () =>
      render(0.85, (t) => {
        const tear = noise(t * 5000) * 0.16 * env(t, 25, 4);
        const bloom =
          tone(t, 523, 0.26) * env(t, 8, 2.2) +
          tone(t, 659, 0.28) * env(Math.max(0, t - 0.15), 8, 2) +
          tone(t, 784, 0.3) * env(Math.max(0, t - 0.3), 8, 1.8);
        return tear + bloom + noise(t * 900) * 0.08 * env(t, 3, 1);
      }),
    legendary: () =>
      render(1.35, (t) => {
        const notes = [523, 659, 784, 988, 1175];
        let s = noise(t * 1100) * 0.07 * env(t, 2, 0.7);
        notes.forEach((f, i) => {
          const start = 0.08 + i * 0.14;
          s += tone(t, f, 0.36) * env(Math.max(0, t - start), 20, 2.4);
          s += tone(t, f * 2.01, 0.1) * env(Math.max(0, t - start), 15, 3);
        });
        return s;
      }),
    ambient: () =>
      renderAmbient((t) => {
        const breath =
          noise(t * 620) * 0.1 * (0.55 + 0.45 * Math.sin(2 * Math.PI * 0.25 * t));
        const pad = tone(t, 98, 0.16) + ostinato(t, [196, 220, 247, 196], 0.5, 0.1);
        return (pad * 0.55 + breath) * 0.32;
      }),
  },

  party: {
    charge: () =>
      render(1.0, (t) => {
        const beat = heartbeat(t, 120, 0.45);
        const whoosh = noise(t * 2000) * 0.18 * env(t, 6, 1.5);
        const rise = ostinato(t, [220, 247, 262, 294], 0.12, 0.28);
        return sat(beat + whoosh + rise);
      }),
    general: () =>
      render(0.5, (t) => {
        return sat(
          tone(t, 880, 0.4) * env(t, 90, 9) +
            ostinato(t, [523, 659, 784, 1046], 0.08, 0.28) +
            noise(t * 6000) * 0.14 * env(t, 100, 25)
        );
      }),
    hidden: () =>
      render(0.7, (t) => {
        let s = 0;
        for (let k = 0; k < 6; k++) {
          const start = k * 0.05;
          const f = 700 + k * 160;
          s += tone(t, f, 0.26) * env(Math.max(0, t - start), 120, 14);
          s += noise((t + k) * 9000) * 0.12 * env(Math.max(0, t - start), 100, 18);
        }
        return s;
      }),
    legendary: () =>
      render(1.4, (t) => {
        const blast = noise(t * 4000) * 0.32 * env(t, 80, 3.5);
        const brassLine = [262, 330, 392, 523, 659].reduce((acc, f, i) => {
          return acc + brass(t, f, 0.28) * env(Math.max(0, t - i * 0.08), 40, 2.2);
        }, 0);
        const cheer = noise(t * 1500) * 0.2 * (0.4 + 0.6 * Math.sin(2 * Math.PI * 6 * t)) * env(t, 5, 0.9);
        return sat(blast + brassLine + cheer + tone(t, 1760, 0.18) * env(Math.max(0, t - 0.4), 60, 6));
      }),
    ambient: () =>
      renderAmbient((t) => {
        const pulse = 0.7 + 0.3 * Math.max(0, Math.sin(2 * Math.PI * 2 * t));
        const pad = tone(t, 130.81, 0.14) + ostinato(t, [261.63, 329.63, 392.0, 329.63], 0.5, 0.1);
        return pad * pulse * 0.3;
      }),
  },

  adventure: {
    charge: () =>
      render(2.5, (t) => {
        const rise = Math.min(1, t / 2.5);
        const bpm = 52 + 50 * rise;
        const drone = choir(t, 61.74, 0.28) * (0.4 + 0.6 * rise);
        const hook = ostinato(t, FATE, 0.4, 0.26 + 0.2 * rise);
        const tick = ((Math.floor(t * 8) % 2) === 0 ? 1 : 0) * tone(t, 740, 0.07) * env(t % 0.125, 180, 36);
        return sat(drone + hook + heartbeat(t, bpm, 0.32) + tick + timpani(t, 0, 52) * 0.35);
      }),
    general: () =>
      render(1.05, (t) => {
        return sat(
          timpani(t, 0, 66) * 0.55 +
            fateSting(t, 0.03, 0.38, 0.15) +
            choir(t, 246.94, 0.22) * env(Math.max(0, t - 0.7), 20, 3.2)
        );
      }),
    hidden: () =>
      render(1.7, (t) => {
        const click =
          noise(t * 10000) * 0.16 * env(t, 120, 16) +
          noise((t - 0.16) * 10000) * 0.12 * env(Math.max(0, t - 0.16), 120, 16);
        return sat(click + fateSting(t, 0.18, 0.34, 0.17) + choir(t, 440, 0.22) * env(Math.max(0, t - 0.95), 10, 1.5));
      }),
    legendary: () =>
      render(3.05, (t) => {
        let s = timpani(t, 0, 50) * 0.95 + saw(t, 49, 0.1) * env(t, 2.2, 0.5);
        s += fateSting(t, 0.08, 0.36, 0.2);
        s += brass(t, 98, 0.24) * env(Math.max(0, t - 1.0), 8, 1.1);
        s += choir(t, 196, 0.28) * env(Math.max(0, t - 1.35), 8, 1.05);
        s += choir(t, 293.66, 0.24) * env(Math.max(0, t - 1.7), 8, 1.0);
        s += choir(t, 392, 0.16) * env(Math.max(0, t - 2.1), 7, 1.1);
        return sat(s);
      }),
    ambient: () =>
      renderAmbient((t) => {
        const swell = 0.8 + 0.2 * Math.sin(2 * Math.PI * 0.125 * t);
        return sat(
          (choir(t, 61.74, 0.18) + ostinato(t, FATE, 0.5, 0.14) + heartbeat(t, 54, 0.12)) * swell
        ) * 0.38;
      }),
  },
};

const royaltyFreeMarker = path.join(outDir, ".royalty-free");
if (fs.existsSync(royaltyFreeMarker) && process.env.FORCE_GENERATE_SOUNDS !== "1") {
  console.log(
    "Skipping synthetic SFX (royalty-free banks present). Set FORCE_GENERATE_SOUNDS=1 to overwrite.",
  );
  process.exit(0);
}

fs.mkdirSync(outDir, { recursive: true });

for (const [key, fn] of Object.entries(THEMES.classic)) {
  const file = path.join(outDir, `${key}.wav`);
  writeWav(file, fn());
  console.log("wrote", file);
}

for (const [theme, banks] of Object.entries(THEMES)) {
  const themeDir = path.join(outDir, theme);
  fs.mkdirSync(themeDir, { recursive: true });
  for (const [key, fn] of Object.entries(banks)) {
    const file = path.join(themeDir, `${key}.wav`);
    writeWav(file, fn());
    console.log("wrote", file);
  }
}

function whoosh(t) {
  const n = noise(t * 9001 + 3.1);
  const sweep = Math.exp(-t * 7.2) * (0.35 + 0.65 * Math.min(1, t / 0.03));
  return n * sweep * (0.45 + 0.55 * Math.sin(2 * Math.PI * (380 + t * 2600) * t));
}

function compassTick(t) {
  const tick = (u, pitch) => {
    const x = Math.max(0, u);
    return Math.exp(-x * 52) * (noise(x * 4200 + pitch) * 0.48 + Math.sin(2 * Math.PI * pitch * x) * 0.55);
  };
  return tick(t, 1760) + tick(t - 0.09, 1480) * 0.72 + tick(t - 0.18, 1320) * 0.42;
}

function paperTear(t) {
  return noise(t * 22000) * Math.exp(-t * 6.4) * (t < 0.11 ? 1 : 0.38) + noise(t * 7400 + 2) * Math.exp(-t * 3.8) * 0.48;
}

function glitchHit(t) {
  const gate = Math.floor(t * 42) % 3 === 0 ? 1 : 0.12;
  return (noise(t * 18000) * 0.72 + saw(t, 88, 0.28)) * gate * Math.exp(-t * 2.1);
}

function cannonHit(t) {
  return timpani(t, 0, 46) * 1.15 + noise(t * 2800) * Math.exp(-t * 8.5) * 0.55 + tone(t, 52, 0.38) * env(t, 36, 4.8);
}

function petalWhoosh(t) {
  return (
    tone(t, 523.25, 0.16) * env(t, 18, 4.2) +
    choir(t, 196, 0.14) * env(t, 8, 3.1) +
    noise(t * 6200) * Math.exp(-t * 5.6) * 0.22
  );
}

function softBreath(t) {
  return choir(t, 174.61, 0.18) * env(t, 6, 2.4) + noise(t * 2400) * Math.exp(-t * 3.2) * 0.12;
}

function kick(t) {
  return Math.exp(-t * 14) * Math.sin(2 * Math.PI * (72 - t * 40) * t) + noise(t * 1800) * Math.exp(-t * 22) * 0.28;
}

const STINGS = {
  adventure_suspense: () => render(0.42, (t) => sat(compassTick(t))),
  adventure_open: () => render(0.52, (t) => sat(paperTear(t) * 0.85 + whoosh(t) * 0.7)),
  cyberpunk_suspense: () => render(0.46, (t) => sat(glitchHit(t))),
  cyberpunk_open: () => render(0.44, (t) => sat(glitchHit(t) * 0.7 + whoosh(t) * 0.85)),
  asmr_suspense: () => render(0.58, (t) => sat(softBreath(t))),
  asmr_open: () => render(0.5, (t) => sat(petalWhoosh(t))),
  party_suspense: () => render(0.36, (t) => sat(kick(t))),
  party_open: () => render(0.56, (t) => sat(cannonHit(t))),
};

const stingDir = path.join(outDir, "stings");
fs.mkdirSync(stingDir, { recursive: true });
for (const [key, fn] of Object.entries(STINGS)) {
  const file = path.join(stingDir, `${key}.wav`);
  writeWav(file, fn());
  console.log("wrote", file);
}

console.log("Done. Theme packs:", Object.keys(THEMES).join(", "), "| stings:", Object.keys(STINGS).join(", "));
