"use client"

import { useTransition } from "react"
import { toast } from "sonner"

type Result = { ok: true } | { ok: false; error: string }

/** Runs a server action in a transition and reports the result as a toast. */
export function useAction() {
  const [pending, startTransition] = useTransition()

  function run<R extends Result>(
    action: () => Promise<R>,
    options?: { success?: string; onSuccess?: (result: Extract<R, { ok: true }>) => void; onError?: () => void }
  ) {
    startTransition(async () => {
      try {
        const result = await action()
        if (!result.ok) {
          options?.onError?.()
          return void toast.error(result.error)
        }
        if (options?.success) toast.success(options.success)
        options?.onSuccess?.(result as Extract<R, { ok: true }>)
      } catch {
        options?.onError?.()
        toast.error("কিছু একটা সমস্যা হয়েছে। আবার চেষ্টা করুন।")
      }
    })
  }

  return { pending, run }
}
