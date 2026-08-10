import { getRuntimeFeatureFlags } from "../utils/runtimeFeatureFlags";

export function resolveMonthlyEffectPoolId(now = new Date()): string {
  const override = getRuntimeFeatureFlags()?.monthlyEffectPoolId as string | undefined;
  if (override) return override;
  const month = now.getMonth() + 1;
  return `pool_${month.toString().padStart(2, "0")}`;
}

export function resolveMonthlyParticleVariant(poolId: string): "spark" | "ribbon" | "dust" {
  const hash = poolId.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const variants = ["spark", "ribbon", "dust"] as const;
  return variants[hash % variants.length]!;
}
