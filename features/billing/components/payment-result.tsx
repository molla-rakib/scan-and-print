"use client"

import { usePaymentResult } from "../hooks/use-payment-result"

/** Shows the result a payment gateway sent the owner back with (?payment=…), once. */
export function PaymentResult() {
  usePaymentResult()
  return null
}
