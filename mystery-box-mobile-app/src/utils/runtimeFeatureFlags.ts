let runtimeFeatureFlags: Record<string, boolean> | undefined;

export function setRuntimeFeatureFlags(flags: Record<string, boolean> | undefined) {
  runtimeFeatureFlags = flags;
}

export function getRuntimeFeatureFlags() {
  return runtimeFeatureFlags;
}
