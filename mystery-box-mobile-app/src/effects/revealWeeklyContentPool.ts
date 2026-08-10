export type WeeklyPoolId = "pool_a" | "pool_b" | "pool_c" | "pool_d";

const POOL_IDS: WeeklyPoolId[] = ["pool_a", "pool_b", "pool_c", "pool_d"];

export function resolveWeeklyPoolId(date = new Date()): WeeklyPoolId {
  const start = new Date(date.getFullYear(), 0, 1);
  const dayMs = 24 * 60 * 60 * 1000;
  const week = Math.floor((date.getTime() - start.getTime()) / dayMs / 7);
  return POOL_IDS[Math.abs(week) % POOL_IDS.length];
}

export function applyWeeklyParticleBias(baseScale: number, date = new Date()): number {
  const pool = resolveWeeklyPoolId(date);
  const bias: Record<WeeklyPoolId, number> = {
    pool_a: 1,
    pool_b: 1.06,
    pool_c: 0.94,
    pool_d: 1.03,
  };
  return Math.round(baseScale * bias[pool] * 100) / 100;
}
