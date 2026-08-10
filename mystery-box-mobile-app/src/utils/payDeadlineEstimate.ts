/** Backend unpaid orders use PAY_MINUTES (15) from order create time. */
export const PAY_WINDOW_MINUTES = 15;

export function estimatePayDeadlineFromNow(): string {
  return new Date(Date.now() + PAY_WINDOW_MINUTES * 60_000).toISOString();
}
