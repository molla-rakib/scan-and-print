"use client"

import { useState } from "react"
import { parsePageRanges } from "@/lib/constants"

/**
 * The page picker's selection, by tapping pages or typing ranges such as "1-3, 5". `pages` empty means
 * every page; the picker is mounted only while open, so it starts from the saved selection.
 */
export function usePagePicker({
  pageCount,
  pages,
  onSave,
  onOpenChange,
}: {
  pageCount: number
  pages: number[]
  onSave: (pages: number[]) => void
  onOpenChange: (open: boolean) => void
}) {
  const all = () => new Set(Array.from({ length: pageCount }, (_, i) => i + 1))
  const [selected, setSelected] = useState<Set<number>>(() => (pages.length ? new Set(pages) : all()))
  const [ranges, setRangesState] = useState("")
  const [rangeError, setRangeError] = useState(false)

  const toggle = (page: number) => {
    const next = new Set(selected)
    if (next.has(page)) next.delete(page)
    else next.add(page)
    setSelected(next)
  }

  const applyRanges = () => {
    const parsed = parsePageRanges(ranges, pageCount)
    if (!parsed || parsed.length === 0) return setRangeError(true)
    setRangeError(false)
    setSelected(new Set(parsed))
  }

  const sorted = [...selected].sort((a, b) => a - b)

  return {
    selected,
    sorted,
    ranges,
    rangeError,
    toggle,
    selectAll: () => setSelected(all()),
    selectNone: () => setSelected(new Set()),
    setRanges: (value: string) => {
      setRangesState(value)
      setRangeError(false)
    },
    submitRanges: (e: React.FormEvent) => {
      e.preventDefault()
      applyRanges()
    },
    save: () => {
      onSave(sorted.length === pageCount ? [] : sorted)
      onOpenChange(false)
    },
  }
}
