"use client"

import { useState } from "react"
import { useAction } from "@/components/use-action"
import { billingAmount, monthlyFeeFor, type ShopDiscount, type SubscriptionMethod } from "@/lib/constants"
import { startGatewayPayment, submitManualPayment } from "../actions"

export type PayMethod = Exclude<SubscriptionMethod, "admin">

/**
 * Renewal form state: months, device count and payment method, the amount they come to, and submit
 * (a manual Send Money claim, or a redirect to the payment gateway).
 */
export function usePayForm({
  deviceFee,
  discount,
  deviceLimit,
  methods,
  manual,
}: {
  deviceFee: number
  discount: ShopDiscount | null
  deviceLimit: number
  methods: PayMethod[]
  manual: { bkashNumber: string; nagadNumber: string }
}) {
  const { pending, run } = useAction()
  const [months, setMonths] = useState<number>(1)
  const [devices, setDevices] = useState(Math.max(1, deviceLimit))
  const monthlyFee = monthlyFeeFor(deviceFee, devices, discount)
  const [method, setMethod] = useState<PayMethod | null>(methods[0] ?? null)
  const [trxId, setTrxId] = useState("")
  const [sender, setSender] = useState("")
  const amount = billingAmount(monthlyFee, months)
  const isManual = method === "manual_bkash" || method === "manual_nagad"
  const ourNumber = method === "manual_bkash" ? manual.bkashNumber : method === "manual_nagad" ? manual.nagadNumber : ""

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!method) return
    if (isManual) {
      run(
        () =>
          submitManualPayment({
            method,
            months,
            devices,
            expectedAmount: amount,
            trxId,
            senderNumber: sender,
          }),
        {
          success: "পেমেন্টের তথ্য পাঠানো হয়েছে। যাচাই হলে মেয়াদ বেড়ে যাবে।",
          onSuccess: () => {
            setTrxId("")
            setSender("")
          },
        }
      )
    } else {
      run(() => startGatewayPayment({ method, months, devices, expectedAmount: amount }), {
        onSuccess: ({ url }) => window.location.assign(url),
      })
    }
  }

  return {
    pending,
    months,
    setMonths,
    devices,
    setDevices,
    method,
    setMethod,
    trxId,
    setTrxId,
    sender,
    setSender,
    monthlyFee,
    amount,
    isManual,
    ourNumber,
    submit,
  }
}
