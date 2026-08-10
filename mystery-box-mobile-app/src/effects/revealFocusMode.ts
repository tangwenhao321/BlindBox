import { getRuntimeRevealFocusModeEnabled, setRevealFocusModeEnabled } from "../utils/revealSettings";

let focusModeEnabled = false;

export function getRevealFocusMode(): boolean {
  return focusModeEnabled || getRuntimeRevealFocusModeEnabled();
}

export function setRevealFocusMode(enabled: boolean): void {
  focusModeEnabled = enabled;
  void setRevealFocusModeEnabled(enabled);
}

export function resetRevealFocusModeForTests(): void {
  focusModeEnabled = false;
}
