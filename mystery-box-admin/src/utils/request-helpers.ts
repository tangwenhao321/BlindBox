/** Backend auth failure codes that force admin re-login. */
export const AUTH_ERROR_CODES = new Set([1001010, 1001007, 1001008])

export function isAuthErrorCode(code: unknown): boolean {
  return typeof code === 'number' && AUTH_ERROR_CODES.has(code)
}

/** Appends x-trace-id in DEV when the business code is not success (1). */
export function appendDevTraceToMessage(
  msg: string,
  code: unknown,
  traceId: string | undefined,
  isDev: boolean = import.meta.env.DEV
): string {
  if (isDev && traceId && code !== 1) {
    return `${msg}（trace: ${traceId}）`
  }
  return msg
}
