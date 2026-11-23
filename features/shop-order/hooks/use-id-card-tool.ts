"use client"

import { useState } from "react"
import { toast } from "sonner"
import { applyLook, detectQuad, loadImage, quadSize, stampText, warpQuad, type ImageLook, type Quad } from "../lib/imaging"
import { cardCopyPdf, maxCardSets, pdfFile } from "../lib/layout-pdf"

/** Card sizes in mm. ISO ID-1 covers the smart NID, bank/ATM cards and the smart driving licence. */
export const CARD_TYPES = {
  id1: { label: "স্মার্ট NID / ATM / ড্রাইভিং লাইসেন্স", widthMm: 85.6, heightMm: 54 },
  custom: { label: "অন্য মাপের কার্ড", widthMm: 90, heightMm: 60 },
} as const
export type CardType = keyof typeof CARD_TYPES

/** Print resolution of the straightened card. */
const DPI = 300

export type CardSide = { image: HTMLCanvasElement; quad: Quad }

/** Turns the corners one step, so the straightened card turns 90°. */
export function rotateQuad(quad: Quad): Quad {
  return [quad[3], quad[0], quad[1], quad[2]]
}

/**
 * The NID / ID card copy tool: front and back photos, their corners, the look, how many copies per sheet,
 * an optional "for … use only" line, and the finished one-page A4 PDF.
 */
export function useIdCardTool(onDone: (file: File, color: boolean) => void) {
  const [cardType, setCardType] = useState<CardType>("id1")
  const [customMm, setCustomMm] = useState({ width: 90, height: 60 })
  const [front, setFront] = useState<CardSide | null>(null)
  const [back, setBack] = useState<CardSide | null>(null)
  const [editing, setEditing] = useState<"front" | "back" | null>(null)
  const [look, setLook] = useState<ImageLook>("color")
  const [sets, setSets] = useState(1)
  const [scale, setScale] = useState<1 | 1.5>(1)
  const [stamp, setStamp] = useState("")
  const [loading, setLoading] = useState(false)
  const [building, setBuilding] = useState(false)

  const size = cardType === "custom" ? { widthMm: customMm.width, heightMm: customMm.height } : CARD_TYPES[cardType]
  const maxSets = maxCardSets({ ...size, scale }, !!back)
  const setsShown = Math.min(Math.max(sets, 1), maxSets)
  // Whether the 1.5× size still fits one copy on the page.
  const largeFits = maxCardSets({ ...size, scale: 1.5 }, !!back) > 0

  async function pick(side: "front" | "back", file: File) {
    setLoading(true)
    try {
      const image = await loadImage(file)
      let quad = detectQuad(image)
      // A card photographed the other way round from its size (upright for a landscape card, or the
      // reverse): turn the corners so it isn't squashed into the wrong shape.
      const measured = quadSize(quad)
      if (measured.width >= measured.height !== size.widthMm >= size.heightMm) quad = rotateQuad(quad)
      const value = { image, quad }
      if (side === "front") setFront(value)
      else setBack(value)
      setEditing(side)
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const setQuad = (side: "front" | "back", quad: Quad) =>
    (side === "front" ? setFront : setBack)((current) => (current ? { ...current, quad } : current))

  const rotate = (side: "front" | "back") =>
    (side === "front" ? setFront : setBack)((current) => (current ? { ...current, quad: rotateQuad(current.quad) } : current))

  /** The straightened, cleaned side at print resolution. */
  function render(side: CardSide) {
    const width = Math.round((size.widthMm / 25.4) * DPI)
    const height = Math.round((size.heightMm / 25.4) * DPI)
    const card = applyLook(warpQuad(side.image, side.quad, width, height), look)
    return stampText(card, stamp)
  }

  async function finish() {
    if (!front || setsShown < 1) return
    setBuilding(true)
    try {
      // Let the button show its spinner before the heavy work blocks the page.
      await new Promise((resolve) => setTimeout(resolve, 30))
      const bytes = await cardCopyPdf(
        { front: render(front), back: back ? render(back) : null },
        { ...size, sets: setsShown, scale }
      )
      onDone(pdfFile(bytes, back ? "NID-copy-both-sides.pdf" : "NID-copy.pdf"), look === "color")
    } catch (error) {
      toast.error((error as Error).message || "কপি তৈরি করা যায়নি। আবার চেষ্টা করুন।")
    } finally {
      setBuilding(false)
    }
  }

  return {
    cardType,
    setCardType,
    customMm,
    setCustomMm,
    size,
    front,
    back,
    removeBack: () => setBack(null),
    editing,
    setEditing,
    look,
    setLook,
    sets: setsShown,
    setSets,
    maxSets,
    largeFits,
    scale,
    setScale,
    stamp,
    setStamp,
    loading,
    building,
    pick,
    setQuad,
    rotate,
    finish,
  }
}
