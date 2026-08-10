/** Format queue estimated wait seconds for display (e.g. "~2 min"). */
export function formatWaitDuration(seconds: number): string {
  if (seconds <= 0) return "0s";
  if (seconds < 60) return `~${seconds}s`;
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `~${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem > 0 ? `~${hours}h ${rem}m` : `~${hours}h`;
}
