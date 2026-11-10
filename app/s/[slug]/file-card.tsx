"use client"

import { useState } from "react"
import { CircleAlertIcon, FileTextIcon, ListChecksIcon, MinusIcon, PlusIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import {
  MAX_COPIES,
  PAPER_SIZE_LABELS,
  SIDES_LABELS,
  formatNumber,
  formatPageSelection,
  formatTaka,
  type ColorMode,
  type PaperSize,
} from "@/lib/constants"
import type { PublicShopView } from "@/lib/public-shop"
import { cn } from "@/lib/utils"
import { PagePicker } from "./page-picker"
import { usePageThumbnail } from "./preview"

export type PrintOptions = {
  colorMode: ColorMode
  copies: number
  duplex: boolean
  paperSize: PaperSize
  /** Selected pages; empty means every page. */
  pages: number[]
}

export type FileItem = {
  key: string
  file: File
  state: "waiting" | "uploading" | "analyzing" | "ready" | "error"
  progress: number
  error?: string
  /** Server id of the draft job, once uploaded. */
  id?: string
  pageCount?: number
  options: PrintOptions
}

export function pricePerPage(shop: PublicShopView, options: PrintOptions) {
  return shop.papers.find((p) => p.size === options.paperSize)?.[options.colorMode] ?? 0
}

export function printedPages(item: FileItem) {
  return item.options.pages.length || item.pageCount || 0
}

export function fileTotal(shop: PublicShopView, item: FileItem) {
  return Math.round(pricePerPage(shop, item.options) * printedPages(item) * item.options.copies * 100) / 100
}

/** A row of mutually exclusive choices (B/W or color, one or both sides, paper size). */
function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string
  value: T
  options: { value: T; label: string; hint?: string; disabled?: boolean }[]
  onChange: (value: T) => void
  disabled?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      <div role="radiogroup" aria-label={label} className="grid auto-cols-fr grid-flow-col gap-1 rounded-lg bg-muted p-1">
        {options.map((option) => {
          const active = option.value === value
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled || option.disabled}
              onClick={() => onChange(option.value)}
              className={cn(
                "flex flex-col items-center rounded-md px-2 py-1.5 text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
                active ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {option.label}
              {option.hint && <span className="text-xs font-normal text-muted-foreground">{option.hint}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Thumbnail({ file }: { file: File }) {
  const url = usePageThumbnail(file, 1, 64)
  return (
    <span className="flex h-16 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-white">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- local preview
        <img src={url} alt="" className="size-full object-cover object-top" />
      ) : (
        <Skeleton className="size-full rounded-none" />
      )}
    </span>
  )
}

export function FileCard({
  item,
  shop,
  disabled,
  onChange,
  onRemove,
}: {
  item: FileItem
  shop: PublicShopView
  disabled: boolean
  onChange: (options: PrintOptions) => void
  onRemove: () => void
}) {
  const [picking, setPicking] = useState(false)
  const { options } = item
  const set = (patch: Partial<PrintOptions>) => onChange({ ...options, ...patch })
  const ready = item.state === "ready" && item.pageCount
  const paper = shop.papers.find((p) => p.size === options.paperSize) ?? shop.papers[0]

  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-xs">
      <div className="flex items-center gap-3">
        {item.state === "error" ? (
          <span className="flex h-16 w-12 shrink-0 items-center justify-center rounded-md border bg-destructive/10 text-destructive">
            <CircleAlertIcon />
          </span>
        ) : ready ? (
          <Thumbnail file={item.file} />
        ) : (
          <span className="flex h-16 w-12 shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground">
            <FileTextIcon />
          </span>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="truncate font-medium">{item.file.name}</div>
          {item.state === "ready" && item.pageCount ? (
            <div className="text-sm text-muted-foreground">
              {formatNumber(item.pageCount)} পৃষ্ঠা
              {options.pages.length > 0 && <> · {formatNumber(options.pages.length)}টি বাছাই</>}
            </div>
          ) : item.state === "error" ? (
            <div className="text-sm text-destructive">{item.error}</div>
          ) : item.state === "uploading" ? (
            <Progress value={item.progress} className="max-w-48" />
          ) : (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Spinner className="size-3.5" />
              {item.state === "analyzing" ? "যাচাই হচ্ছে…" : "অপেক্ষায়…"}
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="ফাইলটি বাদ দিন"
          onClick={onRemove}
          disabled={disabled || item.state === "uploading" || item.state === "analyzing"}
        >
          <XIcon />
        </Button>
      </div>

      {ready && (
        <>
          {item.pageCount! > 1 && (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium">পৃষ্ঠা</div>
                <div className="truncate text-sm text-muted-foreground">{formatPageSelection(options.pages, item.pageCount!)}</div>
              </div>
              <Button variant="outline" size="sm" disabled={disabled} onClick={() => setPicking(true)}>
                <ListChecksIcon /> পৃষ্ঠা বাছুন
              </Button>
              {picking && (
                <PagePicker
                  open
                  onOpenChange={setPicking}
                  file={item.file}
                  fileName={item.file.name}
                  pageCount={item.pageCount!}
                  pages={options.pages}
                  onSave={(pages) => set({ pages })}
                />
              )}
            </div>
          )}

          <Segmented
            label="প্রিন্টের ধরন"
            value={options.colorMode}
            disabled={disabled}
            onChange={(colorMode) => set({ colorMode })}
            options={[
              { value: "bw", label: "সাদা-কালো", hint: `${formatTaka(paper.bw)}/পৃষ্ঠা` },
              {
                value: "color",
                label: "রঙিন",
                hint: shop.hasColor ? `${formatTaka(paper.color)}/পৃষ্ঠা` : "পাওয়া যায় না",
                disabled: !shop.hasColor,
              },
            ]}
          />

          {shop.hasDuplex && printedPages(item) > 1 && (
            <Segmented
              label="কাগজের কোন পাশে"
              value={options.duplex ? "both" : "single"}
              disabled={disabled}
              onChange={(value) => set({ duplex: value === "both" })}
              options={[
                { value: "single", label: SIDES_LABELS.single },
                { value: "both", label: SIDES_LABELS.both },
              ]}
            />
          )}

          {shop.papers.length > 1 && (
            <Segmented
              label="কাগজের মাপ"
              value={options.paperSize}
              disabled={disabled}
              onChange={(paperSize) => set({ paperSize })}
              options={shop.papers.map((p) => ({ value: p.size, label: PAPER_SIZE_LABELS[p.size] }))}
            />
          )}

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">কপি সংখ্যা</span>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                aria-label="কমান"
                disabled={disabled || options.copies <= 1}
                onClick={() => set({ copies: options.copies - 1 })}
              >
                <MinusIcon />
              </Button>
              <span className="w-8 text-center text-lg font-semibold tabular-nums">{formatNumber(options.copies)}</span>
              <Button
                variant="outline"
                size="icon"
                aria-label="বাড়ান"
                disabled={disabled || options.copies >= MAX_COPIES}
                onClick={() => set({ copies: options.copies + 1 })}
              >
                <PlusIcon />
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between border-t pt-3 text-sm">
            <span className="text-muted-foreground">
              {formatNumber(printedPages(item))} পৃষ্ঠা × {formatNumber(options.copies)} কপি × {formatTaka(pricePerPage(shop, options))}
            </span>
            <span className="font-semibold tabular-nums">{formatTaka(fileTotal(shop, item))}</span>
          </div>
        </>
      )}
    </div>
  )
}
