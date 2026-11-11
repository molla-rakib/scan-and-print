"use client"

import { useEffect } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"

const MESSAGES: Record<string, () => void> = {
  success: () => toast.success("পেমেন্ট সফল হয়েছে। মেয়াদ বেড়ে গেছে।"),
  failed: () => toast.error("পেমেন্ট সম্পন্ন হয়নি। আবার চেষ্টা করুন।"),
  cancelled: () => toast.error("পেমেন্ট বাতিল করা হয়েছে।"),
}

/** Shows the result a payment gateway sent the owner back with (?payment=…), once. */
export function PaymentResult() {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const result = params.get("payment")

  useEffect(() => {
    if (!result) return
    MESSAGES[result]?.()
    router.replace(pathname, { scroll: false })
  }, [result, router, pathname])

  return null
}
