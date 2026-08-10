/** 从 axios / request 拒绝对象提取后端 msg */
export function extractApiErrorMessage(err: unknown, fallback = '请求失败'): string {
  if (!err || typeof err !== 'object') {
    return fallback
  }
  const o = err as Record<string, unknown>
  if (typeof o.msg === 'string' && o.msg) {
    return o.msg
  }
  if (typeof o.message === 'string' && o.message) {
    return o.message
  }
  return fallback
}
