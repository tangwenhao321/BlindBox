/**
 * Download Mixkit cinematic SFX (Mixkit License, commercial OK) and convert to Metro WAV.
 * Run from mystery-box-mobile-app: node scripts/importCinematicSounds.mjs
 */
import { spawnSync } from "child_process";
import fs from "fs";
import https from "https";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const tmp = path.join(root, "_tmp_assets", "cinematic_sfx");
const outSounds = path.join(root, "src", "assets", "sounds");
const require = createRequire(import.meta.url);

function resolveFfmpeg() {
  try {
    return require(path.join(root, "_tmp_assets", "node_modules", "ffmpeg-static"));
  } catch {
    return "ffmpeg";
  }
}

const ffmpeg = resolveFfmpeg();

function run(args) {
  const r = spawnSync(ffmpeg, args, { stdio: "pipe" });
  if (r.status !== 0) {
    throw new Error(`ffmpeg failed: ${args.join(" ")}\n${r.stderr?.toString()}`);
  }
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const file = fs.createWriteStream(dest);
    const req = https.get(url, { headers: { "User-Agent": "mystery-box-sfx/1.0" } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        fs.unlinkSync(dest);
        download(res.headers.location, dest).then(resolve, reject);
        return;
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        reject(new Error(`${res.statusCode} ${url}`));
        return;
      }
      res.pipe(file);
      file.on("finish", () => file.close(() => resolve(dest)));
    });
    req.on("error", (err) => {
      file.close();
      try {
        fs.unlinkSync(dest);
      } catch {
        /* ignore */
      }
      reject(err);
    });
  });
}

function sfx(src, dest, af = "loudnorm=I=-14:LRA=8:TP=-1.2") {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  run(["-y", "-i", src, "-t", "2.4", "-ac", "1", "-ar", "44100", "-af", `${af},afade=t=out:st=2.15:d=0.22`, "-c:a", "pcm_s16le", dest]);
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
    "loudnorm=I=-18:LRA=10:TP=-2,afade=t=in:st=0:d=0.2,afade=t=out:st=7.7:d=0.28",
    "-c:a",
    "pcm_s16le",
    dest,
  ]);
}

function charge(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  run([
    "-y",
    "-i",
    src,
    "-t",
    "1.1",
    "-ac",
    "1",
    "-ar",
    "44100",
    "-af",
    "loudnorm=I=-12:LRA=7:TP=-1,afade=t=in:st=0:d=0.04,afade=t=out:st=0.95:d=0.12",
    "-c:a",
    "pcm_s16le",
    dest,
  ]);
}

/** Mixkit preview CDN — Mixkit License (free commercial use). */
const MIXKIT = {
  classicAmbient: "https://assets.mixkit.co/active_storage/sfx/2652/2652-preview.mp3",
  classicCharge: "https://assets.mixkit.co/active_storage/sfx/1666/1666-preview.mp3",
  classicGeneral: "https://assets.mixkit.co/active_storage/sfx/2309/2309-preview.mp3",
  classicHidden: "https://assets.mixkit.co/active_storage/sfx/1668/1668-preview.mp3",
  classicLegendary: "https://assets.mixkit.co/active_storage/sfx/1678/1678-preview.mp3",
  adventureAmbient: "https://assets.mixkit.co/active_storage/sfx/1680/1680-preview.mp3",
  adventureCharge: "https://assets.mixkit.co/active_storage/sfx/1670/1670-preview.mp3",
  adventureGeneral: "https://assets.mixkit.co/active_storage/sfx/1660/1660-preview.mp3",
  adventureHidden: "https://assets.mixkit.co/active_storage/sfx/1678/1678-preview.mp3",
  adventureLegendary: "https://assets.mixkit.co/active_storage/sfx/1683/1683-preview.mp3",
  cyberAmbient: "https://assets.mixkit.co/active_storage/sfx/1681/1681-preview.mp3",
  cyberCharge: "https://assets.mixkit.co/active_storage/sfx/1682/1682-preview.mp3",
  cyberGeneral: "https://assets.mixkit.co/active_storage/sfx/1684/1684-preview.mp3",
  cyberHidden: "https://assets.mixkit.co/active_storage/sfx/1685/1685-preview.mp3",
  cyberLegendary: "https://assets.mixkit.co/active_storage/sfx/1679/1679-preview.mp3",
  asmrAmbient: "https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3",
  asmrCharge: "https://assets.mixkit.co/active_storage/sfx/2574/2574-preview.mp3",
  asmrGeneral: "https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3",
  asmrHidden: "https://assets.mixkit.co/active_storage/sfx/2014/2014-preview.mp3",
  asmrLegendary: "https://assets.mixkit.co/active_storage/sfx/2015/2015-preview.mp3",
  partyAmbient: "https://assets.mixkit.co/active_storage/sfx/2017/2017-preview.mp3",
  partyCharge: "https://assets.mixkit.co/active_storage/sfx/2016/2016-preview.mp3",
  partyGeneral: "https://assets.mixkit.co/active_storage/sfx/2020/2020-preview.mp3",
  partyHidden: "https://assets.mixkit.co/active_storage/sfx/1997/1997-preview.mp3",
  partyLegendary: "https://assets.mixkit.co/active_storage/sfx/1992/1992-preview.mp3",
  stingAdvS: "https://assets.mixkit.co/active_storage/sfx/1670/1670-preview.mp3",
  stingAdvO: "https://assets.mixkit.co/active_storage/sfx/1662/1662-preview.mp3",
  stingCyberS: "https://assets.mixkit.co/active_storage/sfx/1682/1682-preview.mp3",
  stingCyberO: "https://assets.mixkit.co/active_storage/sfx/1683/1683-preview.mp3",
  stingAsmrS: "https://assets.mixkit.co/active_storage/sfx/2012/2012-preview.mp3",
  stingAsmrO: "https://assets.mixkit.co/active_storage/sfx/2021/2021-preview.mp3",
  stingPartyS: "https://assets.mixkit.co/active_storage/sfx/1993/1993-preview.mp3",
  stingPartyO: "https://assets.mixkit.co/active_storage/sfx/1994/1994-preview.mp3",
};

const jobs = [
  ["ambient", MIXKIT.classicAmbient, "classic/ambient.wav"],
  ["charge", MIXKIT.classicCharge, "classic/charge.wav"],
  ["sfx", MIXKIT.classicGeneral, "classic/general.wav"],
  ["sfx", MIXKIT.classicHidden, "classic/hidden.wav"],
  ["sfx", MIXKIT.classicLegendary, "classic/legendary.wav"],
  ["ambient", MIXKIT.adventureAmbient, "adventure/ambient.wav"],
  ["charge", MIXKIT.adventureCharge, "adventure/charge.wav"],
  ["sfx", MIXKIT.adventureGeneral, "adventure/general.wav"],
  ["sfx", MIXKIT.adventureHidden, "adventure/hidden.wav"],
  ["sfx", MIXKIT.adventureLegendary, "adventure/legendary.wav"],
  ["ambient", MIXKIT.cyberAmbient, "cyberpunk/ambient.wav"],
  ["charge", MIXKIT.cyberCharge, "cyberpunk/charge.wav"],
  ["sfx", MIXKIT.cyberGeneral, "cyberpunk/general.wav"],
  ["sfx", MIXKIT.cyberHidden, "cyberpunk/hidden.wav"],
  ["sfx", MIXKIT.cyberLegendary, "cyberpunk/legendary.wav"],
  ["ambient", MIXKIT.asmrAmbient, "asmr/ambient.wav"],
  ["charge", MIXKIT.asmrCharge, "asmr/charge.wav"],
  ["sfx", MIXKIT.asmrGeneral, "asmr/general.wav"],
  ["sfx", MIXKIT.asmrHidden, "asmr/hidden.wav"],
  ["sfx", MIXKIT.asmrLegendary, "asmr/legendary.wav"],
  ["ambient", MIXKIT.partyAmbient, "party/ambient.wav"],
  ["charge", MIXKIT.partyCharge, "party/charge.wav"],
  ["sfx", MIXKIT.partyGeneral, "party/general.wav"],
  ["sfx", MIXKIT.partyHidden, "party/hidden.wav"],
  ["sfx", MIXKIT.partyLegendary, "party/legendary.wav"],
  ["sfx", MIXKIT.stingAdvS, "stings/adventure_suspense.wav"],
  ["sfx", MIXKIT.stingAdvO, "stings/adventure_open.wav"],
  ["sfx", MIXKIT.stingCyberS, "stings/cyberpunk_suspense.wav"],
  ["sfx", MIXKIT.stingCyberO, "stings/cyberpunk_open.wav"],
  ["sfx", MIXKIT.stingAsmrS, "stings/asmr_suspense.wav"],
  ["sfx", MIXKIT.stingAsmrO, "stings/asmr_open.wav"],
  ["sfx", MIXKIT.stingPartyS, "stings/party_suspense.wav"],
  ["sfx", MIXKIT.stingPartyO, "stings/party_open.wav"],
];

fs.mkdirSync(tmp, { recursive: true });

for (const [kind, url, rel] of jobs) {
  const src = path.join(tmp, path.basename(url));
  if (!fs.existsSync(src) || fs.statSync(src).size < 2000) {
    console.log("download", url);
    await download(url, src);
  }
  const dest = path.join(outSounds, rel);
  if (kind === "ambient") ambient(src, dest);
  else if (kind === "charge") charge(src, dest);
  else sfx(src, dest);
  console.log("wrote", rel, fs.statSync(dest).size);
}

for (const name of ["ambient", "charge", "general", "hidden", "legendary"]) {
  fs.copyFileSync(path.join(outSounds, "classic", `${name}.wav`), path.join(outSounds, `${name}.wav`));
}

fs.writeFileSync(
  path.join(outSounds, ".royalty-free"),
  "Mixkit License cinematic SFX (importCinematicSounds.mjs). generateRevealSounds.mjs will not overwrite unless FORCE_GENERATE_SOUNDS=1.\n",
);

console.log("cinematic import done");
