export const TOAST_DURATION_MS = 2600;
export const TOAST_REVEAL_HINT_MS = 2600;
export const TOAST_ACHIEVEMENT_MS = 4200;

type ToastType = "success" | "error" | "info" | "revealHint";

type ToastPayload = {
  id: number;
  message: string;
  type: ToastType;
};

type Listener = (toast: ToastPayload | null) => void;

let listener: Listener | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let seq = 0;

export function subscribeToast(next: Listener) {
  listener = next;
  return () => {
    if (listener === next) {
      listener = null;
    }
  };
}

function emit(toast: ToastPayload | null) {
  listener?.(toast);
}

export function showToast(message: string, type: ToastType = "info", durationMs = TOAST_DURATION_MS) {
  const payload = { id: ++seq, message, type };
  emit(payload);
  if (timer) {
    clearTimeout(timer);
  }
  timer = setTimeout(() => emit(null), durationMs);
}

export const toast = {
  success: (message: string) => showToast(message, "success"),
  error: (message: string) => showToast(message, "error"),
  info: (message: string) => showToast(message, "info"),
  revealHint: (message: string) => showToast(message, "revealHint", TOAST_REVEAL_HINT_MS),
};
