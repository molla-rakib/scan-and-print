"use client"

import { isImageFile } from "./preview"

// A4 at 300 dpi: anything larger can't print sharper, so it is scaled down.
const MAX_SIDE = 3508
// Small PNGs (screenshots, scans of text) stay lossless.
const KEEP_PNG_BYTES = 1024 * 1024
const JPEG_QUALITY = 0.92

/**
 * Re-saves a photo as a JPEG before upload. Turning a PNG into a PDF page means the server decodes and
 * recompresses every pixel in JavaScript, which is slow enough to hit Vercel's time limit; a JPEG is
 * embedded as is. This also makes uploads several times smaller, bakes in the phone's rotation (the server
 * ignores EXIF orientation) and puts transparent areas on white paper. Other files are returned unchanged.
 */
export async function prepareImageForUpload(file: File): Promise<File> {
  if (!isImageFile(file)) return file
  const png = /png$/i.test(file.type) || /\.png$/i.test(file.name)

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" })
  } catch {
    // Not decodable here; the server checks it and explains the problem.
    return file
  }

  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  if (png && scale === 1 && file.size <= KEEP_PNG_BYTES) {
    bitmap.close()
    return file
  }

  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext("2d")
  if (!context) {
    bitmap.close()
    return file
  }
  context.fillStyle = "#fff"
  context.fillRect(0, 0, width, height)
  context.imageSmoothingQuality = "high"
  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY))
  if (!blob) return file
  const name = `${file.name.replace(/\.(png|jpe?g)$/i, "")}.jpg`
  return new File([blob], name, { type: "image/jpeg", lastModified: file.lastModified })
}
