"use client"

import { useState } from "react"
import { useAction } from "@/components/use-action"
import { setDeviceLimit } from "../actions"
import type { AdminShop } from "../types"
import { useResetOnOpen } from "./use-reset-on-open"

/** "ডিভাইস লিমিট": the new limit, starting from the shop's current one each time the dialog opens. */
export function useDeviceLimitDialog(shop: AdminShop, open: boolean, onClose: () => void) {
  const { pending, run } = useAction()
  const [limit, setLimit] = useState(String(shop.deviceLimit))

  useResetOnOpen(open, () => setLimit(String(shop.deviceLimit)))

  function submit(event: React.FormEvent) {
    event.preventDefault()
    run(() => setDeviceLimit(shop.id, Number(limit)), { success: "ডিভাইস লিমিট আপডেট হয়েছে", onSuccess: onClose })
  }

  return { limit, setLimit, pending, submit }
}
