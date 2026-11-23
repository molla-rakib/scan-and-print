"use client"

// Builds the PDFs the shop-page tools upload: NID / card copies and photo sheets at exact millimetres on A4,
// and camera scans one page per photo. pdf-lib is loaded only when a tool finishes.

import { canvasBytes } from "./imaging"

const MM = 72 / 25.4
export const A4_MM = { width: 210, height: 297 }

async function pdfLib() {
  return import("pdf-lib")
}

/** A card copy's sides at their print size, front first. */
export type CardSides = { front: HTMLCanvasElement; back: HTMLCanvasElement | null }

export type CardLayout = {
  /** Card size in mm (ISO ID-1 is 85.6 × 54). */
  widthMm: number
  heightMm: number
  /** Copies of the card (front + back) on the sheet. */
  sets: number
  /** 1 = true size; 1.5 = enlarged, for offices that ask for a readable copy. */
  scale: number
}

/** How many sets fit on one A4 sheet for a card size and scale. */
export function maxCardSets(layout: Omit<CardLayout, "sets">, hasBack: boolean) {
  const w = layout.widthMm * layout.scale
  const h = layout.heightMm * layout.scale
  const rows = Math.floor((A4_MM.height - 30 + 12) / (h + 12))
  // Side by side when both fit across the page; otherwise front above back.
  const across = Math.floor((A4_MM.width - 20 + 10) / (w + 10))
  if (!hasBack) return Math.max(1, rows * across)
  return across >= 2 ? Math.max(1, rows * Math.floor(across / 2)) : Math.max(1, Math.floor(rows / 2))
}

/** Where each card goes on the sheet (mm from the top-left corner). */
export function cardPositions(layout: CardLayout, hasBack: boolean) {
  const w = layout.widthMm * layout.scale
  const h = layout.heightMm * layout.scale
  const gapX = 10
  const gapY = 12
  const across = Math.max(1, Math.floor((A4_MM.width - 20 + gapX) / (w + gapX)))
  const sideBySide = !hasBack || across >= 2
  // Cards in reading order: front, back, front, back… (or only fronts).
  const cards: { x: number; y: number; side: "front" | "back" }[] = []
  const perRow = hasBack ? (sideBySide ? Math.floor(across / 2) * 2 : 1) : across
  const total = layout.sets * (hasBack ? 2 : 1)
  const rowWidth = Math.min(perRow, total) * w + (Math.min(perRow, total) - 1) * gapX
  const left = (A4_MM.width - rowWidth) / 2
  for (let i = 0; i < total; i++) {
    const row = Math.floor(i / perRow)
    const col = i % perRow
    cards.push({ x: left + col * (w + gapX), y: 15 + row * (h + gapY), side: hasBack && i % 2 === 1 ? "back" : "front" })
  }
  return { cards, width: w, height: h }
}

/** One A4 page with the card's sides at true (or enlarged) size and thin dashed cut lines. */
export async function cardCopyPdf(sides: CardSides, layout: CardLayout) {
  const { PDFDocument, rgb } = await pdfLib()
  const doc = await PDFDocument.create()
  const page = doc.addPage([A4_MM.width * MM, A4_MM.height * MM])
  const front = await doc.embedJpg(await canvasBytes(sides.front, 0.92))
  const back = sides.back ? await doc.embedJpg(await canvasBytes(sides.back, 0.92)) : null
  const { cards, width, height } = cardPositions(layout, !!back)
  for (const card of cards) {
    const image = card.side === "back" && back ? back : front
    const x = card.x * MM
    const y = (A4_MM.height - card.y - height) * MM
    page.drawImage(image, { x, y, width: width * MM, height: height * MM })
    page.drawRectangle({
      x: x - 1,
      y: y - 1,
      width: width * MM + 2,
      height: height * MM + 2,
      borderColor: rgb(0.7, 0.7, 0.7),
      borderWidth: 0.4,
      borderDashArray: [3, 3],
    })
  }
  doc.setTitle("NID copy")
  return new Uint8Array(await doc.save())
}

/** One group of identical photos on a photo sheet. */
export type PhotoGroup = { image: HTMLCanvasElement; widthMm: number; heightMm: number; count: number }

/** Places photo groups on A4 row by row (a new row for each group), with 3 mm gaps; returns null if they don't fit. */
export function photoPositions(groups: Omit<PhotoGroup, "image">[]) {
  const margin = 10
  const gap = 3
  const placed: { group: number; x: number; y: number }[] = []
  let y = margin
  for (const [index, group] of groups.entries()) {
    if (group.count <= 0) continue
    const across = Math.max(1, Math.floor((A4_MM.width - 2 * margin + gap) / (group.widthMm + gap)))
    for (let i = 0; i < group.count; i++) {
      const col = i % across
      if (i > 0 && col === 0) y += group.heightMm + gap
      placed.push({ group: index, x: margin + col * (group.widthMm + gap), y })
    }
    y += group.heightMm + gap
  }
  return y - gap > A4_MM.height - margin ? null : placed
}

/** One A4 page of passport/stamp photos with light cut lines between them. */
export async function photoSheetPdf(groups: PhotoGroup[]) {
  const positions = photoPositions(groups)
  if (!positions) throw new Error("এত ছবি এক পাতায় আঁটে না। সংখ্যা কমান।")
  const { PDFDocument, rgb } = await pdfLib()
  const doc = await PDFDocument.create()
  const page = doc.addPage([A4_MM.width * MM, A4_MM.height * MM])
  const images = await Promise.all(groups.map(async (g) => doc.embedJpg(await canvasBytes(g.image, 0.95))))
  for (const p of positions) {
    const g = groups[p.group]
    const x = p.x * MM
    const y = (A4_MM.height - p.y - g.heightMm) * MM
    page.drawImage(images[p.group], { x, y, width: g.widthMm * MM, height: g.heightMm * MM })
    page.drawRectangle({ x, y, width: g.widthMm * MM, height: g.heightMm * MM, borderColor: rgb(0.8, 0.8, 0.8), borderWidth: 0.3 })
  }
  doc.setTitle("Passport photos")
  return new Uint8Array(await doc.save())
}

/** One A4 page per scanned image (landscape when the image is wider than tall), fitted inside 6 mm margins. */
export async function scanPdf(pages: HTMLCanvasElement[]) {
  const { PDFDocument } = await pdfLib()
  const doc = await PDFDocument.create()
  const margin = 6 * MM
  for (const c of pages) {
    const image = await doc.embedJpg(await canvasBytes(c, 0.88))
    const landscape = c.width > c.height
    const [pw, ph] = landscape ? [A4_MM.height * MM, A4_MM.width * MM] : [A4_MM.width * MM, A4_MM.height * MM]
    const page = doc.addPage([pw, ph])
    const scale = Math.min((pw - 2 * margin) / c.width, (ph - 2 * margin) / c.height)
    const w = c.width * scale
    const h = c.height * scale
    page.drawImage(image, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h })
  }
  doc.setTitle("Scan")
  return new Uint8Array(await doc.save())
}

export function pdfFile(bytes: Uint8Array, name: string) {
  return new File([bytes.slice().buffer as ArrayBuffer], name, { type: "application/pdf" })
}
