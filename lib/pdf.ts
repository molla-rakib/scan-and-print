import "server-only"
import { PDFDocument, degrees, type PDFEmbeddedPage } from "pdf-lib"

export class InvalidPdfError extends Error {}

// A4 in PDF points, and the margin around a photo.
const A4 = { width: 595.28, height: 841.89 }
const IMAGE_MARGIN = 28

/**
 * Page count and whether the PDF is encrypted (password-protected PDFs still print, but we can't change them).
 * Throws InvalidPdfError if the file is not a readable PDF.
 */
export async function readPdf(bytes: Buffer): Promise<{ pageCount: number; encrypted: boolean }> {
  try {
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false })
    const pageCount = doc.getPageCount()
    if (pageCount < 1) throw new InvalidPdfError("এই PDF-এ কোনো পৃষ্ঠা নেই।")
    return { pageCount, encrypted: doc.isEncrypted }
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
 * Lays `pages` (1-based; empty = every page) of a PDF out 2 or 4 to a side of A4: two side by side on a
 * landscape page, or a 2 × 2 grid on a portrait page, each shrunk to fit its half or quarter.
 */
export async function pagesPerSheetPdf(bytes: Uint8Array, pages: number[], perSheet: number) {
  const source = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false })
  const numbers = pages.length ? pages : source.getPageIndices().map((i) => i + 1)
  const doc = await PDFDocument.create()
  const sourcePages = numbers.map((n) => source.getPage(n - 1))
  // Embed only what a viewer shows (the CropBox), and keep each page's /Rotate.
  const embedded = await Promise.all(
    sourcePages.map((page) => {
      const box = page.getCropBox()
      return doc.embedPage(page, { left: box.x, bottom: box.y, right: box.x + box.width, top: box.y + box.height })
    })
  )
  const rotations = sourcePages.map((page) => ((page.getRotation().angle % 360) + 360) % 360)
  const landscape = perSheet === 2
  const [width, height] = landscape ? [A4.height, A4.width] : [A4.width, A4.height]
  const [cols, rows] = perSheet === 2 ? [2, 1] : [2, 2]
  const gap = 12
  const cellW = (width - IMAGE_MARGIN * 2 - gap * (cols - 1)) / cols
  const cellH = (height - IMAGE_MARGIN * 2 - gap * (rows - 1)) / rows

  for (let start = 0; start < embedded.length; start += perSheet) {
    const sheet = doc.addPage([width, height])
    embedded.slice(start, start + perSheet).forEach((page, i) => {
      const rotation = rotations[start + i]
      const turned = rotation === 90 || rotation === 270
      // Size as the page is shown (a /Rotate of 90 or 270 swaps width and height).
      const [shownW, shownH] = turned ? [page.height, page.width] : [page.width, page.height]
      const col = i % cols
      const row = Math.floor(i / cols)
      const scale = Math.min(cellW / shownW, cellH / shownH)
      const left = IMAGE_MARGIN + col * (cellW + gap) + (cellW - shownW * scale) / 2
      // PDF y runs upwards: the first row is the top one.
      const bottom = height - IMAGE_MARGIN - (row + 1) * cellH - row * gap + (cellH - shownH * scale) / 2
      drawTurned(sheet, page, rotation, left, bottom, page.width * scale, page.height * scale)
    })
  }
  return Buffer.from(await doc.save())
}

/**
 * Draws an embedded page turned clockwise by `rotation` (its /Rotate), so that the turned page's box has its
 * bottom-left corner at (left, bottom). w × h is the page's own (unturned) drawn size. pdf-lib turns
 * counter-clockwise around the drawing origin, hence the negative angle and the shifted origin.
 */
function drawTurned(
  sheet: ReturnType<PDFDocument["addPage"]>,
  page: PDFEmbeddedPage,
  rotation: number,
  left: number,
  bottom: number,
  w: number,
  h: number
) {
  const origin =
    rotation === 90 ? { x: left, y: bottom + w } : rotation === 180 ? { x: left + w, y: bottom + h } : rotation === 270 ? { x: left + h, y: bottom } : { x: left, y: bottom }
  sheet.drawPage(page, { ...origin, width: w, height: h, rotate: degrees(-rotation) })
}

/**
 * Validates an uploaded PDF or photo (JPG/PNG) and returns a printable PDF. Photos become one A4 page.
 * Throws InvalidPdfError with a Bangla message for anything else.
 */
export async function preparePrintFile(bytes: Buffer, fileName: string) {
  const kind = detectKind(bytes)
  if (!kind) throw new InvalidPdfError("শুধু PDF, JPG বা PNG ফাইল দেওয়া যাবে।")
  if (kind === "pdf") return { pdf: bytes, ...(await readPdf(bytes)), kind, fileName }

  try {
    const pdf = await imageToPdf(bytes, kind)
    return { pdf, pageCount: 1, encrypted: false, kind, fileName }
  } catch {
    throw new InvalidPdfError("ছবিটি পড়া যাচ্ছে না। অন্য একটি ছবি দিন।")
  }
}
