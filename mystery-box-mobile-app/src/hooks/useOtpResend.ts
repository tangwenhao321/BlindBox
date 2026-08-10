import { useCallback, useEffect, useState } from "react";

const DEFAULT_COOLDOWN_SEC = 60;

export function useOtpResend(cooldownSec = DEFAULT_COOLDOWN_SEC) {
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  const startCooldown = useCallback(() => {
    setSecondsLeft(cooldownSec);
  }, [cooldownSec]);

  const canResend = secondsLeft <= 0;

  return { secondsLeft, canResend, startCooldown };
}
