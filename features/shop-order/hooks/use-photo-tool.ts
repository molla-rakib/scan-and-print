"use client"

import { useRef, useState } from "react"
import { toast } from "sonner"
import { replaceBackground } from "../lib/background"
import { cropTo, loadImage } from "../lib/imaging"
import { pdfFile, photoPositions, photoSheetPdf } from "../lib/layout-pdf"
import { cropRect, initialCropView, type CropView } from "./use-crop-editor"

/** Photo sizes in mm. Shops' "passport size" varies; these are the common ones. */
export const PHOTO_SIZES = {
  passport: { label: "পাসপোর্ট (৪০ × ৫০ মিমি)", widthMm: 40, heightMm: 50 },
  visa: { label: "ভিসা (৩৫ × ৪৫ মিমি)", widthMm: 35, heightMm: 45 },
  us: { label: "US ভিসা (২ × ২ ইঞ্চি)", widthMm: 51, heightMm: 51 },
} as const
export type PhotoSize = keyof typeof PHOTO_SIZES
/** Stamp-size photos, offered beside passport photos (same shape, so the same crop works). */
export const STAMP_SIZE = { widthMm: 20, heightMm: 25 }

export const BACKGROUNDS = { keep: null, white: "#ffffff", blue: "#d6e6f5" } as const
export type Background = keyof typeof BACKGROUNDS

const DPI = 300
const px = (mm: number) => Math.round((mm / 25.4) * DPI)

/** Passport / stamp photo sheet: crop a photo to the size, optionally change the background, lay out on A4. */
export function usePhotoTool(onDone: (file: File) => void) {
  const [original, setOriginal] = useState<HTMLCanvasElement | null>(null)
  const [image, setImage] = useState<HTMLCanvasElement | null>(null)
  const [view, setView] = useState<CropView | null>(null)
  const [size, setSize] = useState<PhotoSize>("passport")
  const [background, setBackgroundState] = useState<Background>("keep")
  const [count, setCount] = useState(4)
  const [stamps, setStamps] = useState(0)
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [building, setBuilding] = useState(false)
  // Bumped by every new photo or background choice; a slower, older background result is then dropped.
  const request = useRef(0)

  const dims = PHOTO_SIZES[size]
  const aspect = dims.widthMm / dims.heightMm
  const stampsOffered = size === "passport"
  const groups = [
    { widthMm: dims.widthMm, heightMm: dims.heightMm, count },
    { ...STAMP_SIZE, count: stampsOffered ? stamps : 0 },
  ]
  const fits = (main: number, stamp: number) =>
    photoPositions([
      { widthMm: dims.widthMm, heightMm: dims.heightMm, count: main },
      { ...STAMP_SIZE, count: stampsOffered ? stamp : 0 },
    ]) !== null

  async function pick(file: File) {
    request.current++
    setProcessing(false)
    setLoading(true)
    try {
      const loaded = await loadImage(file, 2000)
      setOriginal(loaded)
      setImage(loaded)
      setBackgroundState("keep")
      setView(initialCropView(loaded))
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function setBackground(next: Background) {
    if (!original) return
    const id = ++request.current
    setBackgroundState(next)
    const color = BACKGROUNDS[next]
    if (!color) {
      setProcessing(false)
      return setImage(original)
    }
    setProcessing(true)
    try {
      const image = await replaceBackground(original, color)
      if (id === request.current) setImage(image)
    } catch (error) {
      if (id !== request.current) return
      toast.error((error as Error).message)
      setBackgroundState("keep")
      setImage(original)
    } finally {
      if (id === request.current) setProcessing(false)
    }
  }

  async function finish() {
    if (!image || !view) return
    setBuilding(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 30))
      const rect = cropRect(image, aspect, view)
      const main = cropTo(image, rect, px(dims.widthMm), px(dims.heightMm))
      const stamp = cropTo(image, rect, px(STAMP_SIZE.widthMm), px(STAMP_SIZE.heightMm))
      const bytes = await photoSheetPdf([
        { image: main, ...groups[0] },
        { image: stamp, ...groups[1] },
      ])
      onDone(pdfFile(bytes, "passport-photos.pdf"))
    } catch (error) {
      toast.error((error as Error).message || "ছবির পাতা তৈরি করা যায়নি। আবার চেষ্টা করুন।")
    } finally {
      setBuilding(false)
    }
  }

  return {
    image,
    view,
    setView,
    size,
    setSize,
    aspect,
    background,
    setBackground,
    count,
    setCount,
    stamps,
    setStamps,
    stampsOffered,
    fits,
    groups,
    loading,
    processing,
    building,
    pick,
    finish,
  }
}
