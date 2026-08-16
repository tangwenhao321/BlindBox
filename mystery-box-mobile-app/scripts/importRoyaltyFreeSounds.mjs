/**
 * Convert CC0 Kenney / artisticdude samples into Metro-ready 44.1kHz mono WAV.
 * Run from mystery-box-mobile-app: node scripts/importRoyaltyFreeSounds.mjs
 */
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const tmp = path.join(root, "_tmp_assets");
const outSounds = path.join(root, "src", "assets", "sounds");
const require = createRequire(import.meta.url);
const ffmpeg = require(path.join(tmp, "node_modules", "ffmpeg-static"));

const K_INT = path.join(tmp, "kenney_interface", "Audio");
const K_RPG = path.join(tmp, "kenney_rpg", "OGG");
const K_HIT = path.join(tmp, "kenney_jingles", "OGG", "jingles_HIT");
const K_NES = path.join(tmp, "kenney_jingles", "OGG", "jingles_NES");
const K_PIZ = path.join(tmp, "kenney_jingles", "OGG", "jingles_PIZZA");
const K_SAX = path.join(tmp, "kenney_jingles", "OGG", "jingles_SAX");
const K_STL = path.join(tmp, "kenney_jingles", "OGG", "jingles_STEEL");
const RPG = path.join(tmp, "rpg_sound_pack", "RPG Sound Pack");

function run(args) {
  const r = spawnSync(ffmpeg, args, { stdio: "pipe" });
  if (r.status !== 0) {
    throw new Error(`ffmpeg failed: ${args.join(" ")}\n${r.stderr?.toString()}`);
  }
}

function sfx(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  run(["-y", "-i", src, "-ac", "1", "-ar", "44100", "-c:a", "pcm_s16le", dest]);
}

function looped(src, dest, seconds) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  run([
    "-y",
    "-stream_loop",
    "-1",
    "-i",
    src,
    "-t",
    String(seconds),
    "-ac",
    "1",
    "-ar",
    "44100",
    "-af",
    "afade=t=out:st=" + (seconds - 0.06).toFixed(2) + ":d=0.06",
    "-c:a",
    "pcm_s16le",
    dest,
  ]);
}

function ambient(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  run([
    "-y",
    "-stream_loop",
    "-1",
    "-i",
    src,
    "-t",
    "8",
    "-ac",
    "1",
    "-ar",
    "44100",
    "-af",
    "volume=0.42,afade=t=in:st=0:d=0.14,afade=t=out:st=7.82:d=0.18",
    "-c:a",
    "pcm_s16le",
    dest,
  ]);
}

const jobs = [
  // classic
  ["ambient", path.join(K_HIT, "jingles_HIT00.ogg"), "classic/ambient.wav"],
  ["loop", path.join(K_INT, "tick_001.ogg"), "classic/charge.wav", 0.78],
  ["sfx", path.join(K_INT, "confirmation_002.ogg"), "classic/general.wav"],
  ["sfx", path.join(K_HIT, "jingles_HIT10.ogg"), "classic/hidden.wav"],
  ["sfx", path.join(K_HIT, "jingles_HIT15.ogg"), "classic/legendary.wav"],
  // adventure
  ["ambient", path.join(K_STL, "jingles_STEEL00.ogg"), "adventure/ambient.wav"],
  ["loop", path.join(K_RPG, "metalLatch.ogg"), "adventure/charge.wav", 0.78],
  ["sfx", path.join(K_RPG, "doorOpen_1.ogg"), "adventure/general.wav"],
  ["sfx", path.join(K_STL, "jingles_STEEL10.ogg"), "adventure/hidden.wav"],
  ["sfx", path.join(K_STL, "jingles_STEEL16.ogg"), "adventure/legendary.wav"],
  // cyberpunk
  ["ambient", path.join(K_NES, "jingles_NES00.ogg"), "cyberpunk/ambient.wav"],
  ["loop", path.join(K_INT, "glitch_001.ogg"), "cyberpunk/charge.wav", 0.78],
  ["sfx", path.join(K_INT, "maximize_005.ogg"), "cyberpunk/general.wav"],
  ["sfx", path.join(K_NES, "jingles_NES10.ogg"), "cyberpunk/hidden.wav"],
  ["sfx", path.join(K_NES, "jingles_NES16.ogg"), "cyberpunk/legendary.wav"],
  // asmr
  ["ambient", path.join(K_RPG, "bookFlip1.ogg"), "asmr/ambient.wav"],
  ["sfx", path.join(K_RPG, "cloth1.ogg"), "asmr/charge.wav"],
  ["sfx", path.join(RPG, "inventory", "bubble.wav"), "asmr/general.wav"],
  ["sfx", path.join(RPG, "inventory", "bubble2.wav"), "asmr/hidden.wav"],
  ["sfx", path.join(RPG, "inventory", "bubble3.wav"), "asmr/legendary.wav"],
  // party
  ["ambient", path.join(K_PIZ, "jingles_PIZZA00.ogg"), "party/ambient.wav"],
  ["sfx", path.join(RPG, "inventory", "coin.wav"), "party/charge.wav"],
  ["sfx", path.join(K_PIZ, "jingles_PIZZA05.ogg"), "party/general.wav"],
  ["sfx", path.join(K_SAX, "jingles_SAX08.ogg"), "party/hidden.wav"],
  ["sfx", path.join(K_PIZ, "jingles_PIZZA16.ogg"), "party/legendary.wav"],
  // stings
  ["sfx", path.join(K_RPG, "metalClick.ogg"), "stings/adventure_suspense.wav"],
  ["sfx", path.join(K_RPG, "creak1.ogg"), "stings/adventure_open.wav"],
  ["loop", path.join(K_INT, "glitch_001.ogg"), "stings/cyberpunk_suspense.wav", 0.42],
  ["sfx", path.join(K_INT, "open_003.ogg"), "stings/cyberpunk_open.wav"],
  ["sfx", path.join(K_RPG, "bookFlip2.ogg"), "stings/asmr_suspense.wav"],
  ["sfx", path.join(RPG, "inventory", "bubble3.wav"), "stings/asmr_open.wav"],
  ["sfx", path.join(RPG, "inventory", "coin2.wav"), "stings/party_suspense.wav"],
  ["sfx", path.join(RPG, "battle", "swing.wav"), "stings/party_open.wav"],
];

for (const job of jobs) {
  const [kind, src, rel, seconds] = job;
  if (!fs.existsSync(src)) throw new Error(`missing source ${src}`);
  const dest = path.join(outSounds, rel);
  if (kind === "ambient") ambient(src, dest);
  else if (kind === "loop") looped(src, dest, seconds);
  else sfx(src, dest);
  console.log("wrote", rel, fs.statSync(dest).size);
}

for (const name of ["ambient", "charge", "general", "hidden", "legendary"]) {
  const src = path.join(outSounds, "classic", `${name}.wav`);
  const dest = path.join(outSounds, `${name}.wav`);
  fs.copyFileSync(src, dest);
  console.log("copied root", name);
}

fs.writeFileSync(
  path.join(outSounds, ".royalty-free"),
  "Royalty-free Kenney / artisticdude banks. generateRevealSounds.mjs will not overwrite unless FORCE_GENERATE_SOUNDS=1.\n",
);

console.log("import done");
