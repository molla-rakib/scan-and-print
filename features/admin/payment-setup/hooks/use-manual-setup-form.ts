"use client"

import { useState } from "react"
import { useAction } from "@/components/use-action"
import { updateManualBilling } from "../actions"
import { SAVED } from "../constants"

export type ManualInitial = { enabled: boolean; bkashNumber: string; nagadNumber: string; instructions: string }

/** Manual (Send Money) settings; `dirtySwitch` while the on/off switch differs from what is saved. */
export function useManualSetupForm(initial: ManualInitial) {
  const { pending, run } = useAction()
  const [form, setForm] = useState(initial)
  const [savedEnabled, setSavedEnabled] = useState(initial.enabled)
  const set = (patch: Partial<ManualInitial>) => setForm((f) => ({ ...f, ...patch }))

  function submit(event: React.FormEvent) {
    event.preventDefault()
    run(() => updateManualBilling(form), { success: SAVED, onSuccess: () => setSavedEnabled(form.enabled) })
  }

  return { form, set, pending, submit, dirtySwitch: form.enabled !== savedEnabled }
}
