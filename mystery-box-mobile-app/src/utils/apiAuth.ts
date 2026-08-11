/** Login/register failures must not trigger the global session-clear handler. */
export function isPublicAuthApiPath(url?: string): boolean {
  if (!url) return false;
  return (
    url.includes("/front/user/login") ||
    url.includes("/front/user/register") ||
    url.includes("/front/user/password") ||
    url.includes("/front/auth/zalo/")
  );
}
