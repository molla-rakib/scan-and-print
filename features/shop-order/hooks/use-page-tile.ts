"use client"

import { useEffect, useRef, useState } from "react"
import { usePageThumbnail } from "./use-page-thumbnail"

/** A page preview that is drawn only once its tile scrolls into view. */
export function usePageTile(file: File, page: number, width: number) {
  const ref = useRef<HTMLButtonElement>(null)
  const [visible, setVisible] = useState(false)
  const url = usePageThumbnail(file, page, width, visible)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && setVisible(true), { rootMargin: "200px" })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return { ref, url }
}
