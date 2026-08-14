import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('element-plus', () => ({
  ElMessageBox: {
    prompt: vi.fn()
  }
}))

vi.mock('@/utils/request', () => ({
  request: vi.fn()
}))

import { ElMessageBox } from 'element-plus'
import { request } from '@/utils/request'
import {
  ADMIN_ACTION_GRANT_TOKEN,
  armAdminActionOtp,
  clearAdminActionOtp,
  consumeAdminActionOtp,
  promptAndArmAdminActionOtp,
  promptAdminActionOtp
} from '@/utils/admin-action-otp'

describe('admin-action-otp', () => {
  beforeEach(() => {
    clearAdminActionOtp()
    vi.clearAllMocks()
  })

  it('consumes raw OTP once and keeps GRANT armed', () => {
    armAdminActionOtp('  once  ')
    expect(consumeAdminActionOtp()).toBe('once')
    expect(consumeAdminActionOtp()).toBeUndefined()

    armAdminActionOtp(ADMIN_ACTION_GRANT_TOKEN)
    expect(consumeAdminActionOtp()).toBe(ADMIN_ACTION_GRANT_TOKEN)
    expect(consumeAdminActionOtp()).toBe(ADMIN_ACTION_GRANT_TOKEN)
  })

  it('promptAdminActionOtp returns trimmed value or null', async () => {
    vi.mocked(ElMessageBox.prompt).mockResolvedValueOnce({ value: '  otp-1  ', action: 'confirm' })
    await expect(promptAdminActionOtp()).resolves.toBe('otp-1')

    vi.mocked(ElMessageBox.prompt).mockRejectedValueOnce('cancel')
    await expect(promptAdminActionOtp()).resolves.toBeNull()
  })

  it('promptAndArmAdminActionOtp arms GRANT on success', async () => {
    vi.mocked(ElMessageBox.prompt).mockResolvedValueOnce({ value: 'static-otp', action: 'confirm' })
    vi.mocked(request).mockResolvedValueOnce({})

    await expect(promptAndArmAdminActionOtp()).resolves.toBe(true)
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/admin/auth/action-grant',
        headers: { 'x-admin-action-otp': 'static-otp' }
      })
    )
    expect(consumeAdminActionOtp()).toBe(ADMIN_ACTION_GRANT_TOKEN)
  })

  it('promptAndArmAdminActionOtp falls back to raw OTP when grant fails', async () => {
    vi.mocked(ElMessageBox.prompt).mockResolvedValueOnce({ value: 'fallback-otp', action: 'confirm' })
    vi.mocked(request).mockRejectedValueOnce(new Error('unavailable'))

    await expect(promptAndArmAdminActionOtp()).resolves.toBe(true)
    expect(consumeAdminActionOtp()).toBe('fallback-otp')
    expect(consumeAdminActionOtp()).toBeUndefined()
  })
})
