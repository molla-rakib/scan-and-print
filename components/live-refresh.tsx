"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

/**
 * Re-renders the current page every few seconds while it is visible, and plays
 * a chime when a new cash order is waiting for approval.
 */
export function LiveRefresh({ pendingApprovals, intervalMs = 5000 }: { pendingApprovals?: number; intervalMs?: number }) {
  const router = useRouter()
  const previous = useRef(pendingApprovals)

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh()
    }, intervalMs)
    return () => clearInterval(id)
  }, [router, intervalMs])

  useEffect(() => {
    if (pendingApprovals !== undefined && previous.current !== undefined && pendingApprovals > previous.current) {
      toast.info("নতুন ক্যাশ অর্ডার আপনার অনুমোদনের অপেক্ষায়")
      chime()
    }
    previous.current = pendingApprovals
  }, [pendingApprovals])

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
