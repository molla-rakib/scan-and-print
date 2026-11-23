"use client"

import { useState } from "react"
import { useAction } from "@/components/use-action"
import { updatePhotoSettings } from "../actions"
import { SAVED } from "../content"
import type { PhotoSettings } from "../types"

/** Passport photo settings: the switch saves at once (and flips back on failure), the price with Save. */
export function usePhotoForm(initial: PhotoSettings) {
  const { pending, run } = useAction()
  const [enabled, setEnabled] = useState(initial.enabled)
  // Kept as text so the field can be cleared while typing.
  const [price, setPrice] = useState(String(initial.sheetPrice))

  function toggle(next: boolean) {
    setEnabled(next)
    run(() => updatePhotoSettings({ enabled: next, sheetPrice: Number(price) || 0 }), {
      success: next ? "পাসপোর্ট ছবি চালু" : "পাসপোর্ট ছবি বন্ধ",
      onError: () => setEnabled(!next),
    })
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    run(() => updatePhotoSettings({ enabled, sheetPrice: Number(price) }), { success: SAVED })
  }

  return { enabled, toggle, price, setPrice, submit, pending }
}
