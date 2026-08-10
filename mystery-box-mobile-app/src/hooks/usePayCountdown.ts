import { useEffect, useState } from "react";

export function usePayCountdown(deadlineIso: string | null | undefined) {
  const [remainingSec, setRemainingSec] = useState(0);

  useEffect(() => {
    if (!deadlineIso) {
      setRemainingSec(0);
      return;
    }
    const tick = () => {
      const end = new Date(deadlineIso).getTime();
      const sec = Math.max(0, Math.floor((end - Date.now()) / 1000));
      setRemainingSec(sec);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [deadlineIso]);

  const mm = String(Math.floor(remainingSec / 60)).padStart(2, "0");
  const ss = String(remainingSec % 60).padStart(2, "0");
  return { remainingSec, label: `${mm}:${ss}`, expired: remainingSec <= 0 };
}
