let weakNetworkMode = false;

export function setRevealWeakNetworkMode(enabled: boolean): void {
  weakNetworkMode = enabled;
}

export function isRevealWeakNetworkMode(): boolean {
  return weakNetworkMode;
}

export function resolveWeakNetworkParticleScale(): number {
  if (weakNetworkMode) return 0.65;
  return 1;
}
