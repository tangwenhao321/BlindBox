import { ElMessageBox } from 'element-plus'
import { request } from '@/utils/request'

/** One-shot OTP attached by request interceptor, then cleared. */
let armedOtp: string | null = null

/** After /admin/auth/action-grant, subsequent high-risk calls may use GRANT within ~5 minutes. */
export const ADMIN_ACTION_GRANT_TOKEN = 'GRANT'

export function armAdminActionOtp(otp: string) {
  armedOtp = otp.trim()
}

/**
 * Attach OTP for the next request. Raw OTP is one-shot; GRANT stays armed
 * until cleared (server Redis TTL ~5m still enforces expiry).
 */
export function consumeAdminActionOtp(): string | undefined {
  if (!armedOtp) return undefined
  const value = armedOtp
  if (value.toUpperCase() !== ADMIN_ACTION_GRANT_TOKEN) {
    armedOtp = null
  }
  return value
}

export function clearAdminActionOtp() {
  armedOtp = null
}

export async function promptAdminActionOtp(title = '高危操作口令'): Promise<string | null> {
  const res = await ElMessageBox.prompt('请输入高危操作口令（静态 OTP 或 TOTP）', title, {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputType: 'password',
    inputPlaceholder: 'ADMIN_ACTION_OTP 或 TOTP'
  }).catch(() => null)
  if (!res || res.value == null || !String(res.value).trim()) {
    return null
  }
  return String(res.value).trim()
}

/**
 * Prompt OTP, exchange for a short-lived GRANT, and arm the next request(s).
 * Falls back to arming the raw OTP if action-grant is unavailable.
 */
export async function promptAndArmAdminActionOtp(title?: string): Promise<boolean> {
  const otp = await promptAdminActionOtp(title)
  if (!otp) return false
  try {
    await request({
      url: '/admin/auth/action-grant',
      method: 'post',
      headers: { 'x-admin-action-otp': otp },
      data: {}
    })
    armAdminActionOtp(ADMIN_ACTION_GRANT_TOKEN)
    return true
  } catch {
    // Older backends without action-grant: send OTP on the next mutating call.
    armAdminActionOtp(otp)
    return true
  }
}
