import { describe, expect, it } from 'vitest'
import {
  AUTH_ERROR_CODES,
  appendDevTraceToMessage,
  isAuthErrorCode
} from '@/utils/request-helpers'

describe('request helpers', () => {
  it('recognizes auth error codes', () => {
    expect(AUTH_ERROR_CODES.has(1001010)).toBe(true)
    expect(isAuthErrorCode(1001007)).toBe(true)
    expect(isAuthErrorCode(1001008)).toBe(true)
    expect(isAuthErrorCode(1)).toBe(false)
    expect(isAuthErrorCode('1001010')).toBe(false)
    expect(isAuthErrorCode(undefined)).toBe(false)
  })

  it('appends trace only in DEV when code is not success', () => {
    expect(appendDevTraceToMessage('fail', 2, 'abc', true)).toBe('fail（trace: abc）')
    expect(appendDevTraceToMessage('ok', 1, 'abc', true)).toBe('ok')
    expect(appendDevTraceToMessage('fail', 2, 'abc', false)).toBe('fail')
    expect(appendDevTraceToMessage('fail', 2, undefined, true)).toBe('fail')
  })
})
