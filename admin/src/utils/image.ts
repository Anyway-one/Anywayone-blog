const PHOTO_MAX_DIMENSION = 2400
const PHOTO_COMPRESSION_THRESHOLD = 2 * 1024 * 1024

function compressedName(name: string, type: string) {
  const extension = type === 'image/webp' ? 'webp' : 'jpg'
  return `${name.replace(/\.[^.]+$/, '')}.${extension}`
}

/** Keep small originals untouched, and reduce large photography uploads for web delivery. */
export async function compressPhotographyImage(file: File): Promise<File> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size <= PHOTO_COMPRESSION_THRESHOLD) return file

  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, PHOTO_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) return file
    context.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()
    const outputType = file.type === 'image/png' ? 'image/webp' : 'image/jpeg'
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, outputType, 0.86))
    if (!blob || blob.size >= file.size) return file
    return new File([blob], compressedName(file.name, outputType), { type: outputType, lastModified: file.lastModified })
  } catch {
    return file
  }
}
