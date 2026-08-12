import { ElMessageBox } from 'element-plus'

/** One-shot OTP attached by request interceptor, then cleared. */
let armedOtp: string | null = null

export function armAdminActionOtp(otp: string) {
  armedOtp = otp.trim()
}

export function consumeAdminActionOtp(): string | undefined {
  if (!armedOtp) return undefined
  const value = armedOtp
  armedOtp = null
  return value
}

export async function promptAdminActionOtp(title = '高危操作口令'): Promise<string | null> {
  const res = await ElMessageBox.prompt('请输入高危操作口令', title, {
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

/** Prompt + arm so the next axios request carries x-admin-action-otp. */
export async function promptAndArmAdminActionOtp(title?: string): Promise<boolean> {
  const otp = await promptAdminActionOtp(title)
  if (!otp) return false
  armAdminActionOtp(otp)
  return true
}
