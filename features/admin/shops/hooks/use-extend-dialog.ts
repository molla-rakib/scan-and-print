"use client"

import { useState } from "react"
import { useAction } from "@/components/use-action"
import { extendSubscription } from "../actions"
import { suggestedAmount, type AdminShop } from "../types"
import { useResetOnOpen } from "./use-reset-on-open"

/** "মেয়াদ বাড়ান": days to add and the amount received (suggested from the days), reset to 30 days on open. */
export function useExtendDialog(shop: AdminShop, open: boolean, onClose: () => void) {
  const { pending, run } = useAction()
  const [days, setDaysState] = useState("30")
  const [amount, setAmount] = useState("")

  useResetOnOpen(open, () => {
    setDaysState("30")
    setAmount(String(suggestedAmount(30, shop.monthlyFee)))
  })

  function setDays(value: string) {
    setDaysState(value)
    setAmount(String(suggestedAmount(Number(value) || 0, shop.monthlyFee)))
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    run(() => extendSubscription(shop.id, Number(days), Number(amount || 0)), { success: "পেমেন্ট রেকর্ড ও মেয়াদ বাড়ানো হয়েছে", onSuccess: onClose })
  }

  return { days, setDays, amount, setAmount, pending, submit }
}
