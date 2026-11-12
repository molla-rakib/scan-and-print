"use client"

import { useState } from "react"
import { toast } from "sonner"
import { useAction } from "@/components/use-action"
import { formatNumber } from "@/lib/constants"
import { deleteOrderHistory } from "../actions"

/** Confirm dialog state and the call that clears every finished order. */
export function useDeleteHistory() {
  const { pending, run } = useAction()
  const [open, setOpen] = useState(false)

  function confirm() {
    run(deleteOrderHistory, {
      onSuccess: ({ deleted }) => {
        toast.success(deleted ? `${formatNumber(deleted)}টি অর্ডার মুছে ফেলা হয়েছে` : "মুছে ফেলার মতো কোনো অর্ডার নেই")
        setOpen(false)
      },
    })
  }

  return { pending, open, setOpen, confirm }
}
