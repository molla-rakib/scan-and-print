"use client"

import { useState } from "react"
import { toast } from "sonner"
import { applyLook, detectQuad, downloadBlob, loadImage, quadSize, warpQuad, type ImageLook, type Quad } from "../lib/imaging"
import { pdfFile, scanPdf } from "../lib/layout-pdf"
import { rotateQuad } from "./use-id-card-tool"

export type ScanPage = { id: string; image: HTMLCanvasElement; quad: Quad }

/** Most pages one camera scan holds. */
export const MAX_SCAN_PAGES = 30
/** Long side of a straightened page: about 200 dpi on A4. */
const LONG_SIDE = 2200
const A4_RATIO = 297 / 210

/** Width × height of a straightened page; close to A4 proportions it snaps to exactly A4. */
function pageSize(quad: Quad) {
  const { width, height } = quadSize(quad)
  let ratio = Math.max(width, height) / Math.max(1, Math.min(width, height))
  if (Math.abs(ratio - A4_RATIO) / A4_RATIO < 0.08) ratio = A4_RATIO
  return width >= height ? { width: LONG_SIDE, height: LONG_SIDE / ratio } : { width: LONG_SIDE / ratio, height: LONG_SIDE }
}

/**
 * Camera scan: photos of paper pages are straightened, cleaned and joined into one PDF, which goes into the
 * order (printed like a photocopy) or downloads to the phone.
 */
export function useScanTool(onDone: (file: File, color: boolean) => void) {
  const [pages, setPages] = useState<ScanPage[]>([])
  const [editing, setEditing] = useState<string | null>(null)
  const [look, setLook] = useState<ImageLook>("bw")
  const [loading, setLoading] = useState(false)
  const [building, setBuilding] = useState<"order" | "download" | null>(null)

  async function addFiles(files: File[]) {
    const room = MAX_SCAN_PAGES - pages.length
    if (files.length > room) toast.error(`একবারে সর্বোচ্চ ${MAX_SCAN_PAGES}টি পৃষ্ঠা।`)
    setLoading(true)
    try {
      const added: ScanPage[] = []
      for (const file of files.slice(0, Math.max(room, 0))) {
        const image = await loadImage(file)
        added.push({ id: crypto.randomUUID(), image, quad: detectQuad(image) })
      }
      setPages((list) => [...list, ...added])
      // A single new page opens straight in the corner editor.
      if (added.length === 1) setEditing(added[0].id)
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const update = (id: string, fn: (page: ScanPage) => ScanPage) => setPages((list) => list.map((p) => (p.id === id ? fn(p) : p)))

  function move(id: string, by: -1 | 1) {
    setPages((list) => {
      const i = list.findIndex((p) => p.id === id)
      const j = i + by
      if (i < 0 || j < 0 || j >= list.length) return list
      const next = [...list]
      const moved = next[i]
      next[i] = next[j]
      next[j] = moved
      return next
    })
  }

  function render(page: ScanPage) {
    const { width, height } = pageSize(page.quad)
    return applyLook(warpQuad(page.image, page.quad, width, height), look)
  }

  async function finish(mode: "order" | "download") {
    if (!pages.length) return
    setBuilding(mode)
    try {
      await new Promise((resolve) => setTimeout(resolve, 30))
      const canvases: HTMLCanvasElement[] = []
      for (const page of pages) {
        canvases.push(render(page))
        // Let the page repaint between heavy pages.
        await new Promise((resolve) => setTimeout(resolve, 0))
      }
      const file = pdfFile(await scanPdf(canvases), "scan.pdf")
      if (mode === "download") {
        downloadBlob(file, "scan.pdf")
        toast.success("PDF ডাউনলোড হচ্ছে")
      } else {
        onDone(file, look === "color")
      }
    } catch (error) {
      toast.error((error as Error).message || "স্ক্যান তৈরি করা যায়নি। আবার চেষ্টা করুন।")
    } finally {
      setBuilding(null)
    }
  }

  return {
    pages,
    editing,
    setEditing,
    look,
    setLook,
    loading,
    building,
    addFiles,
    setQuad: (id: string, quad: Quad) => update(id, (p) => ({ ...p, quad })),
    rotate: (id: string) => update(id, (p) => ({ ...p, quad: rotateQuad(p.quad) })),
    remove: (id: string) => setPages((list) => list.filter((p) => p.id !== id)),
    move,
    finish,
  }
}
