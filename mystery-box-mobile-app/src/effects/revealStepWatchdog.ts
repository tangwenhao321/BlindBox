export type StepWatchdog = {
  arm: () => void;
  disarm: () => void;
  reset: () => void;
};

export function createStepWatchdog(ms: number, onTimeout: () => void): StepWatchdog {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let armed = false;

  const clear = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const arm = () => {
    armed = true;
    clear();
    timer = setTimeout(() => {
      if (armed) onTimeout();
    }, ms);
  };

  const disarm = () => {
    armed = false;
    clear();
  };

  const reset = () => {
    if (armed) arm();
  };

  return { arm, disarm, reset };
}
