import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  estimateMarketplaceNetProceeds,
  formatAdminMoney,
  getAdminCurrency,
  MARKETPLACE_PLATFORM_FEE_RATE
} from '@/utils/format-money'

describe('format-money', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('resolves currency from VITE_CURRENCY then VITE_MARKET', () => {
    expect(getAdminCurrency()).toBe('CNY')
    vi.stubEnv('VITE_MARKET', 'vn')
    expect(getAdminCurrency()).toBe('VND')
    vi.stubEnv('VITE_CURRENCY', 'usd')
    expect(getAdminCurrency()).toBe('USD')
  })

  it('formats CNY and VND amounts', () => {
    expect(formatAdminMoney(null)).toBe('—')
    expect(formatAdminMoney('')).toBe('—')
    expect(formatAdminMoney('x')).toBe('—')
    expect(formatAdminMoney(12.345)).toBe('¥12.35')

    vi.stubEnv('VITE_CURRENCY', 'VND')
    expect(formatAdminMoney(10000.6)).toMatch(/10\.001\s*₫|10,001\s*₫/)
  })

  it('estimates marketplace net proceeds with default 5% fee', () => {
    expect(MARKETPLACE_PLATFORM_FEE_RATE).toBe(0.05)
    expect(estimateMarketplaceNetProceeds(0)).toBe(0)
    expect(estimateMarketplaceNetProceeds(-1)).toBe(0)
    expect(estimateMarketplaceNetProceeds(100)).toBe(95)
    expect(estimateMarketplaceNetProceeds(100, 0.1)).toBe(90)

    vi.stubEnv('VITE_CURRENCY', 'VND')
    expect(estimateMarketplaceNetProceeds(10001)).toBe(9501)
  })

  it.each([
    [0.01, 0.05, 0.01],
    [1, 0.05, 0.95],
    [99.99, 0.05, 94.99],
    [1000, 0, 1000],
    [1000, 0.05, 950],
  ])('admin fee matrix price=%s rate=%s -> %s', (price, rate, expected) => {
    expect(estimateMarketplaceNetProceeds(price, rate)).toBe(expected)
  })
})
