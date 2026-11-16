"use client"

import { useState } from "react"
import { toast } from "sonner"
import { useAction } from "@/components/use-action"
import { formatToken } from "@/lib/constants"
import { deleteOrder } from "../actions"

/** Order menu logic: open, share or copy the customer's status page link, WhatsApp the customer, delete the order. */
export function useOrderActions({
  orderId,
  url,
  token,
  shopName,
  customerPhone,
}: {
  orderId: string
  url: string
  token: number
  shopName: string
  customerPhone?: string | null
}) {
  const { pending, run } = useAction()
  const [confirming, setConfirming] = useState(false)
  const message = `${shopName} — আপনার প্রিন্ট অর্ডার ${formatToken(token)}। অবস্থা দেখুন: ${url}`

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      toast.success("লিংক কপি হয়েছে")
    } catch {
      toast.error("কপি করা যায়নি")
    }
  }

  async function share() {
    if (typeof navigator.share !== "function") return copy()
    try {
      await navigator.share({ title: `${shopName} ${formatToken(token)}`, text: message, url })
    } catch {
      // The menu was closed.
    }
  }

  function openPage() {
    window.open(url, "_blank", "noopener")
  }

  function whatsApp() {
    window.open(`https://wa.me/88${customerPhone}?text=${encodeURIComponent(message)}`, "_blank", "noopener")
  }

  function confirmDelete() {
    run(() => deleteOrder(orderId), { success: "অর্ডার মুছে ফেলা হয়েছে", onSuccess: () => setConfirming(false) })
  }

  return { pending, confirming, setConfirming, copy, share, openPage, whatsApp, confirmDelete }
}
