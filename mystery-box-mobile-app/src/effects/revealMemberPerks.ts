export type MemberRevealPerks = {
  timingScale: number;
  extraHoldMs: number;
  skipCooldownReduction: number;
};

let runtimeMemberLevel = 0;

export function setRevealMemberLevel(level: number): void {
  runtimeMemberLevel = Math.max(0, Math.floor(level));
}

export function getRevealMemberLevel(): number {
  return runtimeMemberLevel;
}

export function resolveMemberRevealPerks(level = runtimeMemberLevel): MemberRevealPerks {
  const tier = Math.max(0, Math.min(5, Math.floor(level)));
  return {
    timingScale: tier >= 3 ? 0.95 : tier >= 1 ? 0.98 : 1,
    extraHoldMs: tier >= 4 ? 120 : tier >= 2 ? 60 : 0,
    skipCooldownReduction: tier >= 5 ? 0.5 : tier >= 2 ? 0.2 : 0,
  };
}

export function resetRevealMemberLevelForTests(): void {
  runtimeMemberLevel = 0;
}
