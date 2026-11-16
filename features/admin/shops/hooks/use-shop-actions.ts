"use client"

import { useState } from "react"
import { useAction } from "@/components/use-action"
import { setShopStatus } from "../actions"
import type { AdminShop } from "../types"

export type ShopDialog = "limit" | "extend" | "discount" | "delete"

/** The shop row's menu: which dialog is open, and suspending / reopening the shop straight from the menu. */
export function useShopActions(shop: AdminShop) {
  const { pending, run } = useAction()
  const [dialog, setDialog] = useState<ShopDialog | null>(null)

  return {
    pending,
    dialog,
    open: (kind: ShopDialog) => setDialog(kind),
    close: () => setDialog(null),
    activate: () => run(() => setShopStatus(shop.id, "active"), { success: "দোকান চালু করা হয়েছে" }),
    suspend: () => run(() => setShopStatus(shop.id, "suspended"), { success: "দোকান বন্ধ করা হয়েছে" }),
  }
}
