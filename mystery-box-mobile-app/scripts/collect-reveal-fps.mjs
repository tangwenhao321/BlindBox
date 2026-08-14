/**
 * Optional reveal FPS collector stub for PERF_LAB_DEVICE=1.
 * Replace body with device telemetry when a farm is available.
 */
const minFps = Number(process.env.PERF_MIN_FPS || 45);
console.log(JSON.stringify({ ok: true, mode: "stub", minFps, note: "wire real FPS sampler here" }));
process.exit(0);
