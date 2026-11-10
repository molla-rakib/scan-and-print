import "server-only"
import { PDFDocument } from "pdf-lib"

export class InvalidPdfError extends Error {}

// A4 in PDF points, and the margin around a photo.
const A4 = { width: 595.28, height: 841.89 }
const IMAGE_MARGIN = 28

/** Returns the page count, or throws InvalidPdfError if the file is not a readable PDF. */
export async function countPdfPages(bytes: Buffer): Promise<number> {
  try {
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false })
    const pages = doc.getPageCount()
    if (pages < 1) throw new InvalidPdfError("এই PDF-এ কোনো পৃষ্ঠা নেই।")
    return pages
  } catch (error) {
    if (error instanceof InvalidPdfError) throw error
    throw new InvalidPdfError("PDF ফাইলটি পড়া যাচ্ছে না। ফাইলটি নষ্ট বা পাসওয়ার্ড দেওয়া থাকতে পারে।")
  }
}

function detectKind(bytes: Buffer): "pdf" | "jpg" | "png" | null {
  if (bytes.subarray(0, 1024).indexOf("%PDF-") !== -1) return "pdf"
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg"
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png"
  return null
}

/** One A4 page with the photo fitted inside the margins, turned to landscape when it is wider than tall. */
async function imageToPdf(bytes: Buffer, kind: "jpg" | "png") {
  const doc = await PDFDocument.create()
  const image = kind === "jpg" ? await doc.embedJpg(bytes) : await doc.embedPng(bytes)
  const landscape = image.width > image.height
  const page = doc.addPage(landscape ? [A4.height, A4.width] : [A4.width, A4.height])
  const { width, height } = page.getSize()
  const scale = Math.min((width - IMAGE_MARGIN * 2) / image.width, (height - IMAGE_MARGIN * 2) / image.height)
  const w = image.width * scale
  const h = image.height * scale
  page.drawImage(image, { x: (width - w) / 2, y: (height - h) / 2, width: w, height: h })
  return Buffer.from(await doc.save())
}

/**
 * Validates an uploaded PDF or photo (JPG/PNG) and returns a printable PDF. Photos become one A4 page.
 * Throws InvalidPdfError with a Bangla message for anything else.
 */
export async function preparePrintFile(bytes: Buffer, fileName: string) {
  const kind = detectKind(bytes)
  if (!kind) throw new InvalidPdfError("শুধু PDF, JPG বা PNG ফাইল দেওয়া যাবে।")
  if (kind === "pdf") return { pdf: bytes, pageCount: await countPdfPages(bytes), kind, fileName }

  try {
    const pdf = await imageToPdf(bytes, kind)
    return { pdf, pageCount: 1, kind, fileName }
  } catch {
    throw new InvalidPdfError("ছবিটি পড়া যাচ্ছে না। অন্য একটি ছবি দিন।")
  }
}
