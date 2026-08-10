/** Seconds-from-now triggers before pay deadline (3 min + 1 min). */
export function buildPayDeadlineReminderSeconds(deadlineIso: string, nowMs = Date.now()): number[] {
  const deadlineMs = new Date(deadlineIso).getTime();
  if (!Number.isFinite(deadlineMs) || deadlineMs <= nowMs) return [];

  const offsetsSec = [3 * 60, 60];
  const triggers: number[] = [];
  for (const offset of offsetsSec) {
    const fireAtSec = Math.floor((deadlineMs - offset * 1000 - nowMs) / 1000);
    if (fireAtSec >= 30) triggers.push(fireAtSec);
  }
  return triggers.length ? triggers : [];
}

export function fallbackPayReminderSeconds(): number {
  return 15 * 60;
}
