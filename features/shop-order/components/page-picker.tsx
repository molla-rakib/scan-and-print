"use client"

import { CheckIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { formatNumber, formatPageSelection } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { usePagePicker } from "../hooks/use-page-picker"
import { usePageTile } from "../hooks/use-page-tile"
import { SHEET_CONTENT, SheetFooter, SheetHeader, TINTED } from "./tools/tool-dialog"

const THUMB_WIDTH = 140

/** One page preview with a round check mark on top, like picking photos on a phone. Drawn once it scrolls into view. */
function PageTile({ file, page, checked, onToggle }: { file: File; page: number; checked: boolean; onToggle: () => void }) {
  const { ref, url } = usePageTile(file, page, THUMB_WIDTH)

  return (
    <button
      ref={ref}
      type="button"
      onClick={onToggle}
      aria-pressed={checked}
      aria-label={`পৃষ্ঠা ${formatNumber(page)}`}
      className="group relative flex flex-col items-center gap-1.5 rounded-xl p-1 text-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span
        className={cn(
          "relative flex aspect-[1/1.414] w-full items-center justify-center overflow-hidden rounded-lg bg-white shadow-sm transition",
          checked ? "ring-[3px] ring-primary" : "ring-1 ring-black/10"
        )}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- local data URL
          <img src={url} alt="" className={cn("size-full object-contain transition-opacity", !checked && "opacity-40")} />
        ) : (
          <Skeleton className="size-full rounded-none" />
        )}
      </span>
      <span
        aria-hidden
        className={cn(
          "absolute top-2.5 right-2.5 flex size-6 items-center justify-center rounded-full shadow-sm transition-colors",
          checked ? "bg-primary text-primary-foreground ring-2 ring-white" : "bg-white/80 ring-1 ring-black/20"
        )}
      >
        {checked && <CheckIcon className="size-3.5" strokeWidth={3} />}
      </span>
      <span className={cn("tabular-nums", checked ? "font-semibold text-primary" : "text-muted-foreground")}>{formatNumber(page)}</span>
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
  const { selected, sorted, ranges, rangeError, toggle, selectAll, selectNone, setRanges, submitRanges, save } = usePagePicker({
    pageCount,
    pages,
    onSave,
    onOpenChange,
  })
  const pill = cn("h-8 rounded-full px-3.5 text-sm font-semibold", TINTED)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className={cn(SHEET_CONTENT, "sm:max-w-2xl")}>
        <SheetHeader title="পৃষ্ঠা নির্বাচন" description={<span className="block truncate">{fileName}</span>} />

        <div className="flex flex-col gap-3 px-5 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" className={pill} onClick={selectAll}>
              Select All
            </Button>
            <Button size="sm" className={pill} onClick={selectNone}>
              Clear
            </Button>
            <span className="ml-auto text-sm font-medium text-muted-foreground tabular-nums">
              {formatNumber(selected.size)} / {formatNumber(pageCount)} পৃষ্ঠা
            </span>
          </div>
          <form className="flex items-center gap-2" onSubmit={submitRanges}>
            <Input
              value={ranges}
              onChange={(e) => setRanges(e.target.value)}
              placeholder="পৃষ্ঠা নম্বর লিখুন, যেমন: ১-৩, ৫, ৮"
              aria-label="পৃষ্ঠা নম্বর লিখুন"
              aria-invalid={rangeError}
              inputMode="numeric"
              className="h-11 flex-1 rounded-xl border-transparent bg-foreground/[0.06]"
            />
            <Button type="submit" className={cn("h-11 shrink-0 rounded-xl px-4 font-semibold", TINTED)} disabled={!ranges.trim()}>
              Apply
            </Button>
          </form>
          {rangeError && <p className="px-0.5 text-xs text-destructive">এভাবে লিখুন: ১-৩, ৫ (১ থেকে {formatNumber(pageCount)} এর মধ্যে)</p>}
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-3 content-start gap-2 overflow-y-auto border-t border-border/60 bg-muted/50 p-3 sm:grid-cols-5">
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((page) => (
            <PageTile key={page} file={file} page={page} checked={selected.has(page)} onToggle={() => toggle(page)} />
          ))}
        </div>

        <SheetFooter className="flex items-center justify-between gap-3">
          <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
            {selected.size ? formatPageSelection(sorted, pageCount) : "অন্তত একটি পৃষ্ঠা নির্বাচন করুন"}
          </span>
          <Button className="h-11 shrink-0 rounded-xl px-7 text-base font-semibold" disabled={selected.size === 0} onClick={save}>
            Done
          </Button>
        </SheetFooter>
      </DialogContent>
    </Dialog>
  )
}
