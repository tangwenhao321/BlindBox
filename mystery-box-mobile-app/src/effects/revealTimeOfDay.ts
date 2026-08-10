export type TimeOfDayBucket = "morning" | "afternoon" | "evening" | "night";

export function resolveTimeOfDayBucket(now = new Date()): TimeOfDayBucket {
  const hour = now.getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 22) return "evening";
  return "night";
}

export function resolveTimeOfDayLustreSaturation(bucket: TimeOfDayBucket): number {
  switch (bucket) {
    case "morning":
      return 1.05;
    case "afternoon":
      return 1;
    case "evening":
      return 0.92;
    case "night":
      return 0.85;
  }
}

export function resolveTimeOfDayAmbientPack(bucket: TimeOfDayBucket): string {
  switch (bucket) {
    case "morning":
      return "bright";
    case "evening":
      return "warm";
    case "night":
      return "soft";
    default:
      return "default";
  }
}
