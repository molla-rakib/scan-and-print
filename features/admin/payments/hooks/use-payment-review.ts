"use client"

import { useState } from "react"
import { useAction } from "@/components/use-action"
import { approvePayment, rejectPayment } from "../actions"

/** Approving a manual payment, or rejecting it with a reason the owner will see. */
export function usePaymentReview(paymentId: string) {
  const { pending, run } = useAction()
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState("")

  function approve() {
    run(() => approvePayment(paymentId), { success: "অনুমোদন হয়েছে, মেয়াদ বেড়েছে" })
  }

  function reject() {
    run(() => rejectPayment(paymentId, reason), { success: "প্রত্যাখ্যান করা হয়েছে", onSuccess: () => setRejecting(false) })
  }

  return { pending, rejecting, setRejecting, reason, setReason, approve, reject }
}
