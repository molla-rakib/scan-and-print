"use client"

import { useNavigationProgress } from "@/hooks/use-navigation-progress"

/** Thin primary-coloured bar at the top of the window while a page is loading after a link click. */
export function NavigationProgress() {
  const progress = useNavigationProgress()
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 transition-opacity duration-200"
      style={{ opacity: progress === null || progress >= 1 ? 0 : 1 }}
    >
      <div
        className="h-full origin-left bg-primary shadow-[0_0_8px_var(--primary)] transition-transform duration-200 ease-out"
        style={{ transform: `scaleX(${progress ?? 0})` }}
      />
    </div>
  )
}
