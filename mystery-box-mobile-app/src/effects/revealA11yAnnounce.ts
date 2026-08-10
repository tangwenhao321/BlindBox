import { AccessibilityInfo } from "react-native";
import { getRevealA11yVoiceRate, revealA11yVoiceDelayMs } from "../utils/revealSettings";

let chain: Promise<void> = Promise.resolve();

/** Queue accessibility announcements so consecutive reveals do not overlap. */
export function queueRevealA11yAnnounce(message: string, delayMs?: number): void {
  chain = chain.then(async () => {
    const rate = await getRevealA11yVoiceRate();
    const gap = delayMs ?? revealA11yVoiceDelayMs(rate);
    await new Promise((resolve) => setTimeout(resolve, gap));
    const punctuated = rate === "slow" && message.includes("传说") ? `${message}。` : message;
    AccessibilityInfo.announceForAccessibility?.(punctuated);
  });
}

export function resetRevealA11yQueueForTests(): void {
  chain = Promise.resolve();
}
