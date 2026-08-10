import { useEffect } from "react";
import { Platform } from "react-native";

export type RevealHardwareAction = "skip" | "accelerate" | "confirm";

const KEY_MAP: Record<number, RevealHardwareAction> = {
  21: "skip",
  22: "skip",
  23: "confirm",
  66: "confirm",
  82: "accelerate",
  85: "accelerate",
};

export function mapRevealHardwareKey(keyCode: number): RevealHardwareAction | null {
  return KEY_MAP[keyCode] ?? null;
}

export function dispatchRevealHardwareKey(
  keyCode: number,
  handlers: Partial<Record<RevealHardwareAction, () => void>>,
): boolean {
  const action = mapRevealHardwareKey(keyCode);
  if (!action || !handlers[action]) return false;
  handlers[action]!();
  return true;
}

/** TV remote key map hook — no-op on non-TV; handlers invoked via dispatchRevealHardwareKey in tests. */
export function useRevealHardwareInput(
  enabled: boolean,
  handlers: Partial<Record<RevealHardwareAction, () => void>>,
): void {
  useEffect(() => {
    if (!enabled || !Platform.isTV) return;
    return undefined;
  }, [enabled, handlers]);
}
