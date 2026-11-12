"use client"

import { useState } from "react"
import { useAction } from "@/components/use-action"
import { deleteShop } from "../actions"
import type { AdminShop } from "../types"

/** Deleting a shop: the typed confirmation must match the shop's link before the delete can run. */
export function useDeleteShopDialog(shop: AdminShop, onClose: () => void) {
  const { pending, run } = useAction()
  const [confirm, setConfirm] = useState("")
  const matches = confirm.trim().toLowerCase() === shop.slug

  function onOpenChange(next: boolean) {
    if (!next) {
      setConfirm("")
      onClose()
    }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!matches) return
    run(() => deleteShop(shop.id, confirm), { success: `${shop.name} মুছে ফেলা হয়েছে`, onSuccess: onClose })
  }

  return { confirm, setConfirm, matches, pending, onOpenChange, submit }
}
