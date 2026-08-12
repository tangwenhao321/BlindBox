import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '@/router'
import { clearAdminToken, getAdminToken, isCookieAuthMode } from '@/utils/admin-auth-token'
import { consumeAdminActionOtp } from '@/utils/admin-action-otp'

const BASE_URL = import.meta.env.VITE_API_PREFIX
const AUTH_ERROR_CODES = new Set([1001010, 1001007, 1001008])
const cookieMode = isCookieAuthMode()

const request = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  // Same-origin HttpOnly cookie auth (docs/ADMIN_SECURITY.md)
  withCredentials: cookieMode
})

request.interceptors.request.use((config) => {
  const token = getAdminToken()
  // Cookie mode + no memory token: rely on HttpOnly cookie (no header).
  // Memory token (e2e) still sent as header fallback.
  if (token) {
    config.headers = config.headers || {}
    config.headers.token = token
  }
  const otp = consumeAdminActionOtp()
  if (otp) {
    config.headers = config.headers || {}
    config.headers['x-admin-action-otp'] = otp
  }
  return config
})

request.interceptors.response.use(
  (res) => res.data.result,
  ({ response }) => {
    const code = response?.data?.code
    let msg = response?.data?.msg || '请求失败'
    const traceId = response?.headers?.['x-trace-id'] as string | undefined
    if (import.meta.env.DEV && traceId && code !== 1) {
      msg = `${msg}（trace: ${traceId}）`
    }
    if (code && code !== 1) {
      ElMessage.warning({ message: msg })
    }
    if (code && AUTH_ERROR_CODES.has(code)) {
      clearAdminToken()
      router.push('/login')
    }
    const payload = response?.data ?? {}
    return Promise.reject(
      Object.assign(typeof payload === 'object' && payload !== null ? { ...payload } : {}, {
        msg: response?.data?.msg || msg,
        traceId
      })
    )
  }
)

export { request }
export default request
