"use client"

import { useState } from "react"
import { useAction } from "@/components/use-action"
import { updateCashSettings } from "../actions"
import type { CashSettings } from "../types"

/** Cash settings, saved as soon as a switch changes; the switch flips back if saving fails. */
export function useCashForm(initial: CashSettings) {
  const { pending, run } = useAction()
  const [cash, setCash] = useState(initial)

  function save(next: CashSettings, success: string) {
    const previous = cash
    setCash(next)
    run(() => updateCashSettings(next), { success, onError: () => setCash(previous) })
  }

  return { cash, save, pending }
}
