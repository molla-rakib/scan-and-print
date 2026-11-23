"use client"

import { useState } from "react"
import { toast } from "sonner"
import { replaceBackground } from "../lib/background"
import { applyLook, canvas, cropTo, detectQuad, downloadBlob, jpegUnder, loadImage, quadSize, warpQuad, type Quad } from "../lib/imaging"
import { cropRect, initialCropView, type CropView } from "./use-crop-editor"

/**
 * Photo and signature rules of online forms. Teletalk job circulars ask for a 300 × 300 photo (≤ 100 KB) and a
 * 300 × 80 signature (≤ 60 KB); other forms differ, so every number can be changed.
 */
export const FORM_PRESETS = {
  teletalk: { label: "সরকারি চাকরি (Teletalk)", photo: { width: 300, height: 300, kb: 100 }, sign: { width: 300, height: 80, kb: 60 } },
  custom: { label: "অন্য ফর্ম", photo: { width: 300, height: 300, kb: 200 }, sign: { width: 300, height: 80, kb: 100 } },
} as const
export type FormPreset = keyof typeof FORM_PRESETS
export type ImageRule = { width: number; height: number; kb: number }

export type FormResult = { blob: Blob; url: string }

/** Cuts a signature down to its ink (plus a margin) and centres it on white at the rule's size. */
function fitSignature(ink: HTMLCanvasElement, width: number, height: number) {
  const ctx = ink.getContext("2d", { willReadFrequently: true })!
  const { data } = ctx.getImageData(0, 0, ink.width, ink.height)
  let [left, top, right, bottom] = [ink.width, ink.height, -1, -1]
  for (let y = 0; y < ink.height; y++) {
    for (let x = 0; x < ink.width; x++) {
      if (data[(y * ink.width + x) * 4] < 140) {
        left = Math.min(left, x)
        right = Math.max(right, x)
        top = Math.min(top, y)
        bottom = Math.max(bottom, y)
      }
    }
  }
  const out = canvas(width, height)
  const octx = out.getContext("2d")!
  octx.fillStyle = "#fff"
  octx.fillRect(0, 0, width, height)
  if (right < left) return out
  const pad = Math.round(Math.max(right - left, bottom - top) * 0.06)
  const box = { x: left - pad, y: top - pad, w: right - left + 2 * pad, h: bottom - top + 2 * pad }
  const scale = Math.min(width / box.w, height / box.h)
  const w = box.w * scale
  const h = box.h * scale
  octx.imageSmoothingQuality = "high"
  octx.drawImage(ink, box.x, box.y, box.w, box.h, (width - w) / 2, (height - h) / 2, w, h)
  return out
}

/** Online-form photo and signature: exact pixel size under the KB limit, downloaded to the phone (free). */
export function useFormPhotoTool() {
  const [preset, setPresetState] = useState<FormPreset>("teletalk")
  const [photoRule, setPhotoRule] = useState<ImageRule>(FORM_PRESETS.teletalk.photo)
  const [signRule, setSignRule] = useState<ImageRule>(FORM_PRESETS.teletalk.sign)
  const [photo, setPhoto] = useState<{ original: HTMLCanvasElement; image: HTMLCanvasElement; view: CropView; white: boolean } | null>(null)
  const [sign, setSign] = useState<{ image: HTMLCanvasElement; quad: Quad } | null>(null)
  const [editingSign, setEditingSign] = useState(false)
  const [results, setResults] = useState<{ photo?: FormResult; sign?: FormResult }>({})
  const [busy, setBusy] = useState<"photo" | "sign" | "white" | null>(null)

  function setPreset(next: FormPreset) {
    setPresetState(next)
    setPhotoRule(FORM_PRESETS[next].photo)
    setSignRule(FORM_PRESETS[next].sign)
    setResults({})
  }

  async function pickPhoto(file: File) {
    try {
      const image = await loadImage(file, 1600)
      setPhoto({ original: image, image, view: initialCropView(image), white: false })
      setResults((r) => ({ ...r, photo: undefined }))
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  async function setWhite(white: boolean) {
    if (!photo) return
    if (!white) return setPhoto({ ...photo, image: photo.original, white })
    setBusy("white")
    try {
      setPhoto({ ...photo, image: await replaceBackground(photo.original, "#ffffff"), white })
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setBusy(null)
    }
  }

  async function pickSign(file: File) {
    try {
      const image = await loadImage(file, 2000)
      setSign({ image, quad: detectQuad(image) })
      setEditingSign(true)
      setResults((r) => ({ ...r, sign: undefined }))
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  function keep(kind: "photo" | "sign", blob: Blob) {
    setResults((r) => {
      if (r[kind]) URL.revokeObjectURL(r[kind]!.url)
      return { ...r, [kind]: { blob, url: URL.createObjectURL(blob) } }
    })
  }

  async function makePhoto() {
    if (!photo) return
    setBusy("photo")
    try {
      const aspect = photoRule.width / photoRule.height
      const out = cropTo(photo.image, cropRect(photo.image, aspect, photo.view), photoRule.width, photoRule.height)
      keep("photo", await jpegUnder(out, photoRule.kb * 1024))
    } finally {
      setBusy(null)
    }
  }

  async function makeSign() {
    if (!sign) return
    setBusy("sign")
    try {
      const { width, height } = quadSize(sign.quad)
      const flat = applyLook(warpQuad(sign.image, sign.quad, width, height), "bw")
      keep("sign", await jpegUnder(fitSignature(flat, signRule.width, signRule.height), signRule.kb * 1024))
      setEditingSign(false)
    } finally {
      setBusy(null)
    }
  }

  const download = (kind: "photo" | "sign") => {
    const result = results[kind]
    if (result) downloadBlob(result.blob, kind === "photo" ? "photo.jpg" : "signature.jpg")
  }

  return {
    preset,
    setPreset,
    photoRule,
    setPhotoRule,
    signRule,
    setSignRule,
    photo,
    setPhotoView: (view: CropView) => setPhoto((p) => (p ? { ...p, view } : p)),
    setWhite,
    sign,
    setSignQuad: (quad: Quad) => setSign((s) => (s ? { ...s, quad } : s)),
    editingSign,
    setEditingSign,
    results,
    busy,
    pickPhoto,
    pickSign,
    makePhoto,
    makeSign,
    download,
  }
}
