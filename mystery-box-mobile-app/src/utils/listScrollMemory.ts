const offsets = new Map<string, number>();

export function rememberListScroll(key: string, offset: number) {
  if (offset >= 0) offsets.set(key, offset);
}

export function peekListScroll(key: string): number | undefined {
  return offsets.get(key);
}

export function consumeListScroll(key: string): number | undefined {
  const value = offsets.get(key);
  return value;
}
