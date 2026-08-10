/** 浏览器端压缩图片，减小上传体积 */
export async function compressImageFile(
  file: File,
  options?: { maxEdge?: number; quality?: number }
): Promise<File> {
  const maxEdge = options?.maxEdge ?? 1280
  const quality = options?.quality ?? 0.85
  if (!file.type.startsWith('image/') || file.size < 80 * 1024) {
    return file
  }
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
  const w = Math.max(1, Math.round(bitmap.width * scale))
  const h = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    return file
  }
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()
  const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), mime, quality)
  )
  if (!blob || blob.size >= file.size) {
    return file
  }
  return new File([blob], file.name.replace(/\.\w+$/, mime === 'image/png' ? '.png' : '.jpg'), {
    type: mime,
    lastModified: Date.now()
  })
}
