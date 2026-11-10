"use client"

import { useState } from "react"
import {
  ChevronRightIcon,
  CircleAlertIcon,
  CopyIcon,
  FileTextIcon,
  LayersIcon,
  ListChecksIcon,
  MinusIcon,
  PaletteIcon,
  PlusIcon,
  RulerIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react"
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

/** A label with an icon above each option group. */
function OptionLabel({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2 text-sm font-medium">
      <Icon className="size-4 text-primary" />
      {children}
    </span>
  )
}

/** A row of mutually exclusive choices; the chosen one is filled in the primary color. */
function Segmented<T extends string>({
  icon,
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  icon: LucideIcon
  label: string
  value: T
  options: { value: T; label: string; hint?: string; disabled?: boolean }[]
  onChange: (value: T) => void
  disabled?: boolean
}) {
  return (
    <div className="flex flex-col gap-2">
      <OptionLabel icon={icon}>{label}</OptionLabel>
      <div role="radiogroup" aria-label={label} className="grid auto-cols-fr grid-flow-col gap-1.5 rounded-xl bg-muted p-1.5">
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
                "flex min-h-12 flex-col items-center justify-center rounded-lg px-2 py-1.5 text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-45",
                active
                  ? "bg-primary font-semibold text-primary-foreground shadow-sm"
                  : "font-medium text-foreground hover:bg-background/70"
              )}
            >
              {option.label}
              {option.hint && (
                <span className={cn("text-xs font-normal", active ? "text-primary-foreground/85" : "text-muted-foreground")}>
                  {option.hint}
                </span>
              )}
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
  index,
  shop,
  disabled,
  onChange,
  onRemove,
}: {
  item: FileItem
  /** Position in the order, shown when there are several files (1-based); null hides it. */
  index: number | null
  shop: PublicShopView
  disabled: boolean
  onChange: (options: PrintOptions) => void
  onRemove: () => void
}) {
  const [picking, setPicking] = useState(false)
  const { options } = item
  const set = (patch: Partial<PrintOptions>) => onChange({ ...options, ...patch })
  const ready = item.state === "ready" && item.pageCount
  const pageCount = item.pageCount ?? 0
  const canPick = ready && pageCount > 1 && !disabled
  const paper = shop.papers.find((p) => p.size === options.paperSize) ?? shop.papers[0]

  return (
    <div className="flex flex-col gap-5 rounded-xl border bg-card p-4 shadow-xs">
      <div className="flex items-center gap-3">
        {item.state === "error" ? (
          <span className="flex h-16 w-12 shrink-0 items-center justify-center rounded-md border bg-destructive/10 text-destructive">
            <CircleAlertIcon />
          </span>
        ) : ready ? (
          <button
            type="button"
            disabled={!canPick}
            onClick={() => setPicking(true)}
            aria-label="পৃষ্ঠা দেখুন ও বাছুন"
            className="shrink-0 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default"
          >
            <Thumbnail file={item.file} />
          </button>
        ) : (
          <span className="flex h-16 w-12 shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground">
            <FileTextIcon />
          </span>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {index !== null && <span className="text-xs font-medium text-primary">ফাইল {formatNumber(index)}</span>}
          <div className="truncate font-medium">{item.file.name}</div>
          {ready ? (
            <div className="text-sm text-muted-foreground">মোট {formatNumber(pageCount)} পৃষ্ঠা</div>
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
          size="icon"
          aria-label="ফাইলটি বাদ দিন"
          className="text-muted-foreground hover:text-destructive"
          onClick={onRemove}
          disabled={disabled || item.state === "uploading" || item.state === "analyzing"}
        >
          <XIcon />
        </Button>
      </div>

      {ready && (
        <>
          {pageCount > 1 && (
            <>
              <button
                type="button"
                disabled={!canPick}
                onClick={() => setPicking(true)}
                className="flex w-full items-center gap-3 rounded-xl border border-primary/25 bg-primary/5 p-3 text-left transition-colors outline-none hover:bg-primary/10 focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <ListChecksIcon className="size-5" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm font-medium">কোন পৃষ্ঠা প্রিন্ট হবে?</span>
                  <span className="truncate text-sm text-muted-foreground">
                    {options.pages.length
                      ? `${formatPageSelection(options.pages, pageCount)} (${formatNumber(options.pages.length)}টি)`
                      : `সব পৃষ্ঠা (${formatNumber(pageCount)}টি)`}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-sm">
                  পৃষ্ঠা বাছুন
                  <ChevronRightIcon className="size-4" />
                </span>
              </button>
              {picking && (
                <PagePicker
                  open
                  onOpenChange={setPicking}
                  file={item.file}
                  fileName={item.file.name}
                  pageCount={pageCount}
                  pages={options.pages}
                  onSave={(pages) => set({ pages })}
                />
              )}
            </>
          )}

          <Segmented
            icon={PaletteIcon}
            label="প্রিন্টের রং"
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
              icon={LayersIcon}
              label="কাগজের এক পাশে না দুই পাশে?"
              value={options.duplex ? "both" : "single"}
              disabled={disabled}
              onChange={(value) => set({ duplex: value === "both" })}
              options={[
                { value: "single", label: SIDES_LABELS.single },
                { value: "both", label: SIDES_LABELS.both, hint: "কাগজ কম লাগবে" },
              ]}
            />
          )}

          {shop.papers.length > 1 && (
            <Segmented
              icon={RulerIcon}
              label="কাগজের মাপ"
              value={options.paperSize}
              disabled={disabled}
              onChange={(paperSize) => set({ paperSize })}
              options={shop.papers.map((p) => ({
                value: p.size,
                label: PAPER_SIZE_LABELS[p.size],
                hint: `${formatTaka(p[options.colorMode])}/পৃষ্ঠা`,
              }))}
            />
          )}

          <div className="flex items-center justify-between gap-3">
            <OptionLabel icon={CopyIcon}>কত কপি?</OptionLabel>
            <div className="flex items-center gap-1 rounded-xl bg-muted p-1.5">
              <Button
                variant="outline"
                size="icon"
                className="size-10 bg-background"
                aria-label="কমান"
                disabled={disabled || options.copies <= 1}
                onClick={() => set({ copies: options.copies - 1 })}
              >
                <MinusIcon />
              </Button>
              <span className="w-12 text-center text-xl font-semibold tabular-nums" aria-live="polite">
                {formatNumber(options.copies)}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="size-10 bg-background"
                aria-label="বাড়ান"
                disabled={disabled || options.copies >= MAX_COPIES}
                onClick={() => set({ copies: options.copies + 1 })}
              >
                <PlusIcon />
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl bg-emerald-500/10 px-4 py-3">
            <div className="min-w-0">
              <div className="text-sm font-medium text-emerald-800 dark:text-emerald-300">এই ফাইলের দাম</div>
              <div className="text-xs text-muted-foreground">
                {formatNumber(printedPages(item))} পৃষ্ঠা × {formatNumber(options.copies)} কপি × {formatTaka(pricePerPage(shop, options))}
              </div>
            </div>
            <span className="text-xl font-semibold text-emerald-800 tabular-nums dark:text-emerald-300">
              {formatTaka(fileTotal(shop, item))}
            </span>
          </div>
        </>
      )}
    </div>
  )
}
