"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"

type Run = { from: string; progress: number }

/**
 * Progress (0–1) of a page load started by a click on an internal link, or null when idle. The load counts
 * as finished as soon as the URL differs from the one the click started on.
 */
export function useNavigationProgress() {
  const pathname = usePathname()
  const search = useSearchParams().toString()
  const current = search ? `${pathname}?${search}` : pathname
  const [run, setRun] = useState<Run | null>(null)
  const trickle = useRef<ReturnType<typeof setInterval> | null>(null)
  const safety = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function stopTimers() {
      if (trickle.current) clearInterval(trickle.current)
      if (safety.current) clearTimeout(safety.current)
    }

    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const anchor = (event.target as Element | null)?.closest?.("a")
      if (!anchor || !anchor.href || anchor.target === "_blank" || anchor.hasAttribute("download")) return
      const url = new URL(anchor.href, window.location.href)
      if (url.origin !== window.location.origin) return
      // Same page (or only the #hash changes): nothing to load.
      if (url.pathname === window.location.pathname && url.search === window.location.search) return

      stopTimers()
      setRun({ from: window.location.pathname + window.location.search, progress: 0.08 })
      // Creep towards 90% so a slow page still looks alive; the real finish is the URL change.
      trickle.current = setInterval(() => setRun((r) => r && { ...r, progress: r.progress + (0.9 - r.progress) * 0.12 }), 200)
      // Never leave the bar hanging (e.g. a navigation that was cancelled).
      safety.current = setTimeout(() => setRun(null), 15_000)
    }

    document.addEventListener("click", onClick, true)
    return () => {
      document.removeEventListener("click", onClick, true)
      stopTimers()
    }
  }, [])

  const finished = run !== null && run.from !== current

  // The new page is in: stop creeping, show 100% briefly, then hide.
  useEffect(() => {
    if (!finished) return
    if (trickle.current) clearInterval(trickle.current)
    if (safety.current) clearTimeout(safety.current)
    const hide = setTimeout(() => setRun(null), 250)
    return () => clearTimeout(hide)
  }, [finished])

  return run === null ? null : finished ? 1 : run.progress
}
