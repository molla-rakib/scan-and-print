"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { formatTaka, formatToken } from "@/lib/constants"

export type LatestCashOrder = { token: number; amount: number; name: string } | null

/**
 * Re-renders the current page every few seconds while it is visible, and plays a chime when a new
 * cash order comes in (it prints right away; the owner collects the money at the counter).
 */
export function LiveRefresh({ latestCash, intervalMs = 5000 }: { latestCash?: LatestCashOrder; intervalMs?: number }) {
  const router = useRouter()
  const previous = useRef(latestCash?.token)

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh()
    }, intervalMs)
    return () => clearInterval(id)
  }, [router, intervalMs])

  useEffect(() => {
    const token = latestCash?.token
    if (latestCash && token !== previous.current) {
      toast.info(`নতুন ক্যাশ অর্ডার ${formatToken(latestCash.token)}`, {
        description: `${latestCash.name ? `${latestCash.name} — ` : ""}কাউন্টারে ${formatTaka(latestCash.amount)} নিতে হবে`,
        duration: 15_000,
      })
      chime()
    }
    previous.current = token
  }, [latestCash])

  return null
}

function chime() {
  try {
    const ctx = new AudioContext()
    for (const [i, freq] of [880, 1320].entries()) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.18)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.18 + 0.3)
      osc.connect(gain).connect(ctx.destination)
      osc.start(ctx.currentTime + i * 0.18)
      osc.stop(ctx.currentTime + i * 0.18 + 0.3)
    }
  } catch {
    // Audio may be blocked until the user interacts with the page.
  }
}
