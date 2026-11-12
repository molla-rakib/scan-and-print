"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import type { CashCustomer } from "@/components/cash-checkout"
import type { JobStatus, PaymentMethod } from "@/lib/constants"
import type { PublicOrderView } from "@/lib/public-shop"

const FINAL: JobStatus[] = ["completed", "cancelled"]

/** The order as it changes: polled every 3 s until it is final, plus retrying a payment that didn't go through. */
export function useJobStatus(initial: PublicOrderView, paymentResult: string | null) {
  const [job, setJob] = useState(initial)
  const [paying, setPaying] = useState<PaymentMethod | null>(null)

  useEffect(() => {
    if (paymentResult === "cancelled") toast.error("পেমেন্ট বাতিল করা হয়েছে।")
    if (paymentResult === "failed") toast.error("পেমেন্ট সফল হয়নি।")
  }, [paymentResult])

  useEffect(() => {
    if (FINAL.includes(job.status)) return
    const id = setInterval(async () => {
      if (document.visibilityState !== "visible") return
      const response = await fetch(`/api/public/orders/${job.publicId}`, { cache: "no-store" }).catch(() => null)
      if (response?.ok) setJob(await response.json())
    }, 3000)
    return () => clearInterval(id)
  }, [job.publicId, job.status])

  async function retry(method: PaymentMethod, customer?: CashCustomer) {
    setPaying(method)
    // The print options were saved with the first attempt; only the payment is retried.
    const response = await fetch(`/api/public/orders/${job.publicId}/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method, customer }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      toast.error(data.error || "কিছু একটা সমস্যা হয়েছে।")
      return setPaying(null)
    }
    window.location.href = data.redirectUrl
  }

  /** Completed or cancelled: nothing more will happen. */
  const final = FINAL.includes(job.status)

  return { job, paying, retry, final }
}
