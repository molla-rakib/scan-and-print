"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { formatNumber, formatPageSelection, parsePageRanges } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { usePageThumbnail } from "./preview"

const THUMB_WIDTH = 140

/** One page preview with a checkbox on top. Drawn only once it scrolls into view. */
function PageTile({ file, page, checked, onToggle }: { file: File; page: number; checked: boolean; onToggle: () => void }) {
  const ref = useRef<HTMLButtonElement>(null)
  const [visible, setVisible] = useState(false)
  const url = usePageThumbnail(file, page, THUMB_WIDTH, visible)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && setVisible(true), { rootMargin: "200px" })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <button
      ref={ref}
      type="button"
      onClick={onToggle}
      aria-pressed={checked}
      aria-label={`পৃষ্ঠা ${formatNumber(page)}`}
      className={cn(
        "group relative flex flex-col items-center gap-1.5 rounded-lg border-2 p-1.5 text-xs transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        checked ? "border-primary bg-primary/5" : "border-transparent bg-muted/60 hover:bg-muted"
      )}
    >
      <span className="relative flex aspect-[1/1.414] w-full items-center justify-center overflow-hidden rounded-sm bg-white shadow-xs">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- local data URL
          <img src={url} alt="" className={cn("size-full object-contain", !checked && "opacity-45")} />
        ) : (
          <Skeleton className="size-full rounded-none" />
        )}
      </span>
      {/* The tile is the button; the checkbox only shows the state. */}
      <Checkbox checked={checked} tabIndex={-1} aria-hidden className="pointer-events-none absolute top-2.5 left-2.5 size-5 bg-background shadow-sm" />
      <span className={cn("tabular-nums", checked ? "font-medium text-primary" : "text-muted-foreground")}>{formatNumber(page)}</span>
    </button>
  )
}

/**
 * Lets the customer pick which pages to print by tapping page previews, or by typing ranges such as
 * "1-3, 5". `pages` empty means every page. Mount it only while open, so it starts from the saved selection.
 */
export function PagePicker({
  open,
  onOpenChange,
  file,
  fileName,
  pageCount,
  pages,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  file: File
  fileName: string
  pageCount: number
  pages: number[]
  onSave: (pages: number[]) => void
}) {
  const all = () => new Set(Array.from({ length: pageCount }, (_, i) => i + 1))
  const [selected, setSelected] = useState<Set<number>>(() => (pages.length ? new Set(pages) : all()))
  const [ranges, setRanges] = useState("")
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92svh] flex-col gap-3 p-0 sm:max-w-2xl">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle>পৃষ্ঠা বাছুন</DialogTitle>
          <DialogDescription className="truncate">{fileName}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 px-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setSelected(all())}>
              সব
            </Button>
            <Button size="sm" variant="outline" onClick={() => setSelected(new Set())}>
              কোনোটি না
            </Button>
            <span className="ml-auto text-sm text-muted-foreground">
              {formatNumber(selected.size)} / {formatNumber(pageCount)} পৃষ্ঠা
            </span>
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              applyRanges()
            }}
          >
            <Input
              value={ranges}
              onChange={(e) => {
                setRanges(e.target.value)
                setRangeError(false)
              }}
              placeholder="যেমন: ১-৩, ৫, ৮"
              aria-label="পৃষ্ঠার নম্বর লিখুন"
              aria-invalid={rangeError}
              inputMode="numeric"
              className="h-8"
            />
            <Button type="submit" size="sm" variant="secondary" disabled={!ranges.trim()}>
              বাছুন
            </Button>
          </form>
          {rangeError && <p className="text-xs text-destructive">এভাবে লিখুন: ১-৩, ৫ (১ থেকে {formatNumber(pageCount)})</p>}
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-3 content-start gap-2 overflow-y-auto border-y bg-muted/30 p-3 sm:grid-cols-5">
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((page) => (
            <PageTile key={page} file={file} page={page} checked={selected.has(page)} onToggle={() => toggle(page)} />
          ))}
        </div>

        <DialogFooter className="flex-row items-center justify-between gap-2 px-4 pb-4 sm:justify-between">
          <span className="min-w-0 truncate text-sm text-muted-foreground">
            {selected.size ? formatPageSelection(sorted, pageCount) : "অন্তত একটি পৃষ্ঠা বাছুন"}
          </span>
          <Button
            disabled={selected.size === 0}
            onClick={() => {
              onSave(sorted.length === pageCount ? [] : sorted)
              onOpenChange(false)
            }}
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
