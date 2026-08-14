import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearAdminToken,
  getAdminToken,
  isAdminAuthenticated,
  isCookieAuthMode,
  setAdminToken,
  setAdminTokenCookieMode
} from '@/utils/admin-auth-token'

describe('admin-auth-token', () => {
  beforeEach(() => {
    clearAdminToken()
    sessionStorage.clear()
    localStorage.clear()
    vi.unstubAllEnvs()
  })

  afterEach(() => {
    clearAdminToken()
    vi.unstubAllEnvs()
  })

  it('stores and returns JWT from memory/sessionStorage', () => {
    expect(getAdminToken()).toBeNull()
    expect(isAdminAuthenticated()).toBe(false)

    setAdminToken('jwt-abc')
    expect(getAdminToken()).toBe('jwt-abc')
    expect(sessionStorage.getItem('token')).toBe('jwt-abc')
    expect(isAdminAuthenticated()).toBe(true)

    clearAdminToken()
    expect(getAdminToken()).toBeNull()
    expect(sessionStorage.getItem('token')).toBeNull()
  })

  it('migrates legacy localStorage token once', () => {
    localStorage.setItem('token', 'legacy-jwt')
    expect(getAdminToken()).toBe('legacy-jwt')
    expect(localStorage.getItem('token')).toBeNull()
    expect(sessionStorage.getItem('token')).toBe('legacy-jwt')
  })

  it('cookie mode uses session flag without persisting JWT', () => {
    vi.stubEnv('VITE_ADMIN_COOKIE_AUTH', 'true')
    expect(isCookieAuthMode()).toBe(true)

    setAdminTokenCookieMode()
    expect(getAdminToken()).toBeNull()
    expect(isAdminAuthenticated()).toBe(true)
    expect(sessionStorage.getItem('token')).toBeNull()
    expect(sessionStorage.getItem('admin_cookie_session')).toBe('1')

    setAdminTokenCookieMode('e2e-memory')
    expect(getAdminToken()).toBe('e2e-memory')
  })
})
