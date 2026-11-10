"use client"

// Page thumbnails for the customer's own files, drawn in the browser with pdf.js (nothing extra is
// uploaded). pdf.js is loaded only when the first PDF needs a preview.

import { useEffect, useMemo, useState } from "react"
import type { PDFDocumentProxy } from "pdfjs-dist"

let pdfjs: Promise<typeof import("pdfjs-dist")> | null = null

function loadPdfjs() {
  pdfjs ??= import("pdfjs-dist").then((lib) => {
    lib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString()
    return lib
  })
  return pdfjs
}

const documents = new WeakMap<File, Promise<PDFDocumentProxy>>()
const thumbnails = new Map<string, Promise<string>>()
const fileIds = new WeakMap<File, number>()
let nextFileId = 0

function openPdf(file: File) {
  let doc = documents.get(file)
  if (!doc) {
    doc = loadPdfjs().then(async (lib) => lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise)
    documents.set(file, doc)
  }
  return doc
}

async function renderThumbnail(file: File, pageNumber: number, width: number) {
  const doc = await openPdf(file)
  const page = await doc.getPage(pageNumber)
  const base = page.getViewport({ scale: 1 })
  const viewport = page.getViewport({ scale: (width * Math.min(window.devicePixelRatio || 1, 2)) / base.width })
  const canvas = document.createElement("canvas")
  canvas.width = Math.ceil(viewport.width)
  canvas.height = Math.ceil(viewport.height)
  await page.render({ canvas, viewport, background: "white" }).promise
  page.cleanup()
  return canvas.toDataURL("image/jpeg", 0.75)
}

export function isImageFile(file: File) {
  return /^image\/(jpeg|png)$/.test(file.type) || /\.(jpe?g|png)$/i.test(file.name)
}

/** A thumbnail URL for one page of a PDF or for a photo, or null while it is being drawn. */
export function usePageThumbnail(file: File, pageNumber: number, width: number, enabled = true) {
  const image = isImageFile(file)
  const imageUrl = useMemo(() => (image ? URL.createObjectURL(file) : null), [file, image])
  useEffect(() => () => void (imageUrl && URL.revokeObjectURL(imageUrl)), [imageUrl])

  if (!fileIds.has(file)) fileIds.set(file, nextFileId++)
  const key = `${fileIds.get(file)}:${pageNumber}:${width}`
  const [rendered, setRendered] = useState<{ key: string; url: string } | null>(null)

  useEffect(() => {
    if (image || !enabled) return
    let cancelled = false
    let thumbnail = thumbnails.get(key)
    if (!thumbnail) {
      thumbnail = renderThumbnail(file, pageNumber, width)
      thumbnails.set(key, thumbnail)
      thumbnail.catch(() => thumbnails.delete(key))
    }
    thumbnail.then((url) => !cancelled && setRendered({ key, url })).catch(() => {})
    return () => {
      cancelled = true
    }
  }, [file, image, key, pageNumber, width, enabled])

  return imageUrl ?? (rendered?.key === key ? rendered.url : null)
}
