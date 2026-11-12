"use client"

import { useState } from "react"
import { useAction } from "@/components/use-action"
import { updatePricing } from "../actions"
import { SAVED } from "../content"
import type { Prices, Pricing } from "../types"

// Inputs are kept as text so the fields can be cleared while typing.
const toForm = (p: Prices & { enabled?: boolean }) => ({
  enabled: p.enabled ?? true,
  bw: String(p.bw),
  color: String(p.color),
  bwSheet: String(p.bwSheet),
  colorSheet: String(p.colorSheet),
})

export type PaperForm = ReturnType<typeof toForm>

const toPrices = (p: PaperForm) => ({
  enabled: p.enabled,
  bw: Number(p.bw),
  color: Number(p.color),
  bwSheet: Number(p.bwSheet),
  colorSheet: Number(p.colorSheet),
})

/** Pricing form state: one row of prices per paper size plus the color-both-sides switch, and save. */
export function usePricingForm(initial: Pricing) {
  const { pending, run } = useAction()
  const [form, setForm] = useState({
    A4: toForm(initial),
    Legal: toForm(initial.paperSizes.Legal),
    A3: toForm(initial.paperSizes.A3),
  })
  const [colorDuplex, setColorDuplex] = useState(initial.colorDuplex)
  const update = (key: keyof typeof form, patch: Partial<PaperForm>) => setForm({ ...form, [key]: { ...form[key], ...patch } })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- A4 is always on
    const { enabled, ...a4 } = toPrices(form.A4)
    run(
      () => updatePricing({ ...a4, colorDuplex, paperSizes: { Legal: toPrices(form.Legal), A3: toPrices(form.A3) } }),
      { success: SAVED }
    )
  }

  return { form, update, colorDuplex, setColorDuplex, submit, pending }
}
