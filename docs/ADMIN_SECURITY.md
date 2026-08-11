# Admin security (session & XSS)

## Current model

The admin SPA (`mystery-box-admin`) authenticates via Sa-Token JWT returned as `tokenValue` from `POST /admin/auth/login`.

**Dual mode** (choose via env):

| Mode | Env | Client storage | Request auth |
|------|-----|----------------|--------------|
| Header (default) | unset / not `true` | memory + `sessionStorage` | `token` header |
| Cookie-primary | `VITE_ADMIN_COOKIE_AUTH=true` | no JWT in storage (optional e2e memory only) | HttpOnly cookie via `withCredentials`; header only if memory token set |

Sa-Token writes a cookie named `token` on login when `is-read-cookie` / cookie config is enabled. Cookie-primary mode requires **same-origin** admin UI + API (reverse proxy); cross-origin cookie auth needs carefully configured CORS + credentials (not the default path).

## XSS risk

Any script that runs in the admin origin can read `sessionStorage` / memory and exfiltrate the JWT. HttpOnly cookies cannot be read by JavaScript, so they are strictly better against XSS token theft—but they require same-site (or carefully configured CORS + `withCredentials`) delivery.

Mitigations in this repo:

1. **Token scope**: `sessionStorage` limits lifetime to the browser tab (unlike persistent `localStorage`). Cookie mode avoids storing the JWT in JS storage entirely.
2. **CSP**: `index.html` meta CSP plus Vite `server` / `preview` `Content-Security-Policy` headers (`default-src 'self'`, `script-src 'self'` in production-oriented preview headers; Element Plus needs `style-src 'unsafe-inline'`; images allow `data:` / `https:`).
3. **Response headers**: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` on Vite preview/dev.

Dev Vite HMR still needs relaxed `script-src` (`unsafe-inline` / `unsafe-eval`) in the HTML meta tag. **Do not** ship that relaxation on the production reverse proxy.

## Recommended production: reverse-proxy HttpOnly cookie

Preferred hardening when admin UI and API are **same-origin** (e.g. `https://admin.example.com` serves static admin and proxies `/api` → backend):

1. Configure Sa-Token so the session cookie is hardened (prod profiles already set this — Sa-Token **1.37** `SaCookieConfig` supports these YAML keys):

```yaml
sa-token:
  is-share: false
  is-read-header: true
  is-read-cookie: true
  cookie:
    httpOnly: true
    secure: true
    sameSite: Strict
```

Property names: `cookie.httpOnly`, `cookie.secure`, `cookie.sameSite` (also `domain`, `path`). Verified against Sa-Token 1.37.0 `SaCookieConfig`.

2. Build admin with `VITE_ADMIN_COOKIE_AUTH=true` so axios uses `withCredentials: true` and login calls `setAdminTokenCookieMode()` (clears JWT from `sessionStorage`).
3. Ensure CORS is either unused (same-origin) or explicitly allows credentials with a fixed `Access-Control-Allow-Origin` (never `*` with credentials).
4. At nginx / CDN, set a **strict** CSP without `'unsafe-eval'`, for example:

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'
```

Adjust `connect-src` / `img-src` if the admin loads APIs or assets from other hosts.

### Fallback: nginx Set-Cookie flags

If a future Sa-Token upgrade dropped `cookie.httpOnly` (1.37 has it), harden at the proxy instead, e.g.:

```
proxy_cookie_flags token httponly secure samesite=strict;
```

(or equivalent `proxy_cookie_path` / header rewrite). Prefer Sa-Token YAML when available.

## Why HttpOnly was not forced as the only mode

Admin login is commonly used via Vite proxy in development and may be split across hosts in some deployments. Exclusive cookie-only without a same-origin guarantee would break header-based clients and e2e helpers. Dual mode keeps header+sessionStorage as default; enable cookie-primary only when same-origin is guaranteed.

## Checklist

- [x] Dual-mode available: header (default) vs `VITE_ADMIN_COOKIE_AUTH=true` cookie-primary
- [x] `POST /admin/auth/logout` + admin client calls it before clearing local session
- [ ] Production admin served same-origin with API when enabling cookie-primary (required)
- [ ] Reverse-proxy CSP without Vite HMR exceptions
- [ ] Cookie `HttpOnly` + `Secure` + `SameSite` (prod YAML / Sa-Token 1.37)
- [ ] Rotate admin credentials / revoke tokens after suspected XSS
