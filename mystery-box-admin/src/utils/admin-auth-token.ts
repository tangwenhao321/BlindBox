/**
 * Admin JWT storage: in-memory + sessionStorage (not localStorage) by default.
 * Survives refresh within the tab; cleared when the tab/window closes.
 * Still readable by XSS — pair with CSP; prefer HttpOnly cookie behind same-origin reverse proxy
 * (set VITE_ADMIN_COOKIE_AUTH=true; see docs/ADMIN_SECURITY.md).
 */
const TOKEN_KEY = 'token'
/** Non-secret tab flag: cookie-primary session is active (JWT itself is HttpOnly). */
const COOKIE_SESSION_FLAG = 'admin_cookie_session'

let memoryToken: string | null = null

export function isCookieAuthMode(): boolean {
  return import.meta.env.VITE_ADMIN_COOKIE_AUTH === 'true'
}

function readSession(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

function writeSession(token: string | null): void {
  try {
    if (token) {
      sessionStorage.setItem(TOKEN_KEY, token)
    } else {
      sessionStorage.removeItem(TOKEN_KEY)
    }
  } catch {
    // private mode / quota — memory still works for this page load
  }
}

function setCookieSessionFlag(active: boolean): void {
  try {
    if (active) {
      sessionStorage.setItem(COOKIE_SESSION_FLAG, '1')
    } else {
      sessionStorage.removeItem(COOKIE_SESSION_FLAG)
    }
  } catch {
    // ignore
  }
}

function hasCookieSessionFlag(): boolean {
  try {
    return sessionStorage.getItem(COOKIE_SESSION_FLAG) === '1'
  } catch {
    return false
  }
}

/** One-time migration from legacy localStorage token. */
function migrateFromLocalStorage(): string | null {
  try {
    const legacy = localStorage.getItem(TOKEN_KEY)
    if (!legacy) {
      return null
    }
    localStorage.removeItem(TOKEN_KEY)
    writeSession(legacy)
    return legacy
  } catch {
    return null
  }
}

/**
 * Returns JWT for Authorization header when present.
 * Cookie mode: only in-memory e2e fallback (no sessionStorage JWT).
 */
export function getAdminToken(): string | null {
  if (isCookieAuthMode()) {
    if (memoryToken) {
      return memoryToken
    }
    // Purge leftover JWT storage from header-mode sessions
    writeSession(null)
    try {
      localStorage.removeItem(TOKEN_KEY)
    } catch {
      // ignore
    }
    return null
  }
  if (memoryToken) {
    return memoryToken
  }
  const fromSession = readSession()
  if (fromSession) {
    memoryToken = fromSession
    return memoryToken
  }
  const migrated = migrateFromLocalStorage()
  if (migrated) {
    memoryToken = migrated
    return memoryToken
  }
  return null
}

/** True when header JWT exists, or cookie mode with login flag set this tab. */
export function isAdminAuthenticated(): boolean {
  if (getAdminToken()) {
    return true
  }
  return isCookieAuthMode() && hasCookieSessionFlag()
}

export function setAdminToken(token: string): void {
  memoryToken = token
  writeSession(token)
  setCookieSessionFlag(false)
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    // ignore
  }
}

/**
 * Cookie-primary login: clear JWT from session/local storage.
 * Optionally keep an in-memory token for e2e header fallback.
 */
export function setAdminTokenCookieMode(memoryTokenForE2e?: string): void {
  memoryToken = memoryTokenForE2e ?? null
  writeSession(null)
  setCookieSessionFlag(true)
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    // ignore
  }
}

export function clearAdminToken(): void {
  memoryToken = null
  writeSession(null)
  setCookieSessionFlag(false)
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    // ignore
  }
}
