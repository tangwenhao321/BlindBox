import { useEffect, useState, type ReactNode } from "react";
import { AppHeader } from "./AppHeader";
import { isRevealGestureLocked, subscribeRevealGestureLock } from "../../effects/revealGestureLock";

type Props = {
  title: string;
  onBack?: () => void;
  rightSlot?: ReactNode;
};

export function SubPageHeader({ title, onBack, rightSlot }: Props) {
  const [gestureLocked, setGestureLocked] = useState(isRevealGestureLocked());
  useEffect(() => subscribeRevealGestureLock(setGestureLocked), []);

  return (
    <AppHeader
      variant="centered"
      title={title}
      onBack={gestureLocked ? undefined : onBack}
      rightActions={rightSlot}
    />
  );
}
