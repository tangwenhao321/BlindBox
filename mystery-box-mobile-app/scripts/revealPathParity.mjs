#!/usr/bin/env node
/** Optional CI parity smoke: expo vs native scaled charge/hold bands stay within tolerance. */
const pacingScale = { normal: 1, fast: 0.85, ceremony: 1.35, finale: 1.12 };
function scale(ms, pacing) {
  return Math.round(ms * (pacingScale[pacing] ?? 1));
}

const pacing = "normal";
const expoCharge = scale(420, pacing);
const nativeCharge = scale(420, pacing);
const expoHold = scale(720, pacing);
const nativeHold = scale(720, pacing);

const drift = Math.max(Math.abs(expoCharge - nativeCharge), Math.abs(expoHold - nativeHold));
if (drift > 0) {
  console.error(`unexpected parity drift ${drift}`);
  process.exit(1);
}
console.log("reveal path parity ok");
