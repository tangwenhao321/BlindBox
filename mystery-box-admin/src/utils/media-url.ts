/** 管理端展示用：兼容相对路径 /uploads 与历史绝对地址 */
export function resolveMediaUrl(url?: string | null): string {
  if (!url) {
    return ''
  }
  const u = url.trim()
  if (!u) {
    return ''
  }
  if (u.startsWith('data:') || u.startsWith('blob:')) {
    return u
  }
  if (u.startsWith('http://') || u.startsWith('https://')) {
    const idx = u.indexOf('/uploads/')
    if (idx >= 0) {
      return u.substring(idx)
    }
    return u
  }
  return u.startsWith('/') ? u : `/${u}`
}
