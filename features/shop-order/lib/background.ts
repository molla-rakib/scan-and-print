"use client"

// Replaces the background behind a person (passport photos) with a plain color. MediaPipe's selfie
// segmenter runs in the browser from files on our own site (public/mediapipe/, see
// scripts/copy-mediapipe.mjs); nothing is sent anywhere. Loaded only when the customer asks for it.

import type { ImageSegmenter } from "@mediapipe/tasks-vision"
import { canvas } from "./imaging"

let segmenter: Promise<ImageSegmenter> | null = null

function loadSegmenter() {
  segmenter ??= (async () => {
    const { FilesetResolver, ImageSegmenter } = await import("@mediapipe/tasks-vision")
    const fileset = await FilesetResolver.forVisionTasks("/mediapipe")
    return ImageSegmenter.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: "/mediapipe/selfie_segmenter.tflite", delegate: "CPU" },
      runningMode: "IMAGE",
      outputConfidenceMasks: true,
      outputCategoryMask: false,
    })
  })().catch((error) => {
    segmenter = null
    throw error
  })
  return segmenter
}

/** A copy of `source` with everything but the person painted `color` (CSS hex, e.g. "#ffffff"). */
export async function replaceBackground(source: HTMLCanvasElement, color: string) {
  let model: ImageSegmenter
  try {
    model = await loadSegmenter()
  } catch {
    throw new Error("ব্যাকগ্রাউন্ড বদলানো যাচ্ছে না। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।")
  }
  const result = model.segment(source)
  try {
    const mask = result.confidenceMasks?.[0]
    if (!mask) throw new Error("ছবিতে মানুষ খুঁজে পাওয়া যায়নি।")
    const confidence = mask.getAsFloat32Array()
    const out = canvas(source.width, source.height)
    const ctx = out.getContext("2d")!
    ctx.drawImage(source, 0, 0)
    const image = ctx.getImageData(0, 0, out.width, out.height)
    const d = image.data
    const bg = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16))
    const sx = mask.width / out.width
    const sy = mask.height / out.height
    for (let y = 0; y < out.height; y++) {
      const my = Math.min(mask.height - 1, Math.floor(y * sy))
      for (let x = 0; x < out.width; x++) {
        const mx = Math.min(mask.width - 1, Math.floor(x * sx))
        // Sharpen the soft mask a little so hair edges don't look like a halo.
        const a = Math.min(1, Math.max(0, (confidence[my * mask.width + mx] - 0.25) / 0.5))
        const i = (y * out.width + x) * 4
        for (let ch = 0; ch < 3; ch++) d[i + ch] = d[i + ch] * a + bg[ch] * (1 - a)
      }
    }
    ctx.putImageData(image, 0, 0)
    return out
  } finally {
    result.close()
  }
}
