"use client"

import { useEffect, useState } from "react"
import type { TransferPageView } from "../queries"

const POLL_MS = 2000

/** The session, refreshed every two seconds while it is open (new scans, files reaching the PC). */
export function useTransfer(initial: TransferPageView) {
  const [view, setView] = useState(initial)

  useEffect(() => {
    if (!view.open) return
    let stopped = false
    const timer = setInterval(async () => {
      try {
        const response = await fetch(`/api/public/transfers/${initial.id}`, { cache: "no-store" })
        if (response.ok && !stopped) setView(await response.json())
      } catch {
        // Try again on the next tick.
      }
    }, POLL_MS)
    return () => {
      stopped = true
      clearInterval(timer)
    }
  }, [initial.id, view.open])

  return { view, setView }
}
