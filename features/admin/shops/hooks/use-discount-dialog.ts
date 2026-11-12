"use client"

import { useState } from "react"
import { useAction } from "@/components/use-action"
import { removeDiscount, setDiscount } from "../actions"
import type { AdminShop } from "../types"

/** Sets or removes a shop's subscription discount; `preview` is the monthly fee after the discount. */
export function useDiscountDialog(shop: AdminShop, onClose: () => void) {
  const { pending, run } = useAction()
  const [kind, setKind] = useState<"percent" | "fixed">(shop.discount?.kind ?? "percent")
  const [value, setValue] = useState(shop.discount ? String(shop.discount.value) : "")
  const [until, setUntil] = useState(shop.discount?.until ?? "")
  const [note, setNote] = useState(shop.discount?.note ?? "")

  const number = Number(value) || 0
  const preview =
    kind === "percent" ? Math.round(shop.baseFee * (1 - Math.min(number, 100) / 100)) : Math.min(shop.baseFee, Math.round(number))

  function submit(event: React.FormEvent) {
    event.preventDefault()
    run(() => setDiscount(shop.id, { kind, value: number, until, note }), { success: "ছাড় সেট হয়েছে", onSuccess: onClose })
  }

  function remove() {
    run(() => removeDiscount(shop.id), { success: "ছাড় তুলে নেওয়া হয়েছে", onSuccess: onClose })
  }

  return { kind, setKind, value, setValue, until, setUntil, note, setNote, preview, pending, submit, remove }
}
