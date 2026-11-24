"use client"

import { ChevronRightIcon, CircleAlertIcon, FileTextIcon, LayersIcon, ListChecksIcon, MinusIcon, PlusIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import {
  JOB_KIND_LABELS,
  MAX_COPIES,
  PAPER_SIZE_LABELS,
  SIDES_LABELS,
  formatNumber,
  formatPageSelection,
  formatTaka,
  sheetCount,
  unitPrice,
  type PagesPerSheet,
} from "@/lib/constants"
import type { PublicShopView } from "@/lib/public-shop"
import { cn } from "@/lib/utils"
import { useFileCard } from "../hooks/use-file-card"
import { usePageThumbnail } from "../hooks/use-page-thumbnail"
import type { FileItem, PrintOptions } from "../lib/file-options"
import { PagePicker } from "./page-picker"
import { ChoiceRow } from "./tools/choice-row"
import { FIELD_LABEL } from "./tools/tool-dialog"

const THUMB_BOX = "flex h-16 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-black/5"

function Thumbnail({ file }: { file: File }) {
  const url = usePageThumbnail(file, 1, 64)
  return (
    <span className={THUMB_BOX}>
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
  const {
    picking,
    setPicking,
    options,
    set,
    ready,
    pageCount,
    canPick,
    paper,
    showSides,
    duplex,
    unitHint,
    printed,
    selected,
    total,
    sidesNote,
    photoSheet,
    sizeChoice,
    perSheetChoice,
  } = useFileCard(item, shop, disabled, onChange)

  return (
    <div className="flex flex-col gap-5 overflow-hidden rounded-2xl bg-card p-4 shadow-sm ring-1 ring-foreground/5">
      <div className="flex items-center gap-3">
        {item.state === "error" ? (
          <span className={cn(THUMB_BOX, "bg-destructive/10 text-destructive")}>
            <CircleAlertIcon />
          </span>
        ) : ready ? (
          <button
            type="button"
            disabled={!canPick}
            onClick={() => setPicking(true)}
            aria-label="পৃষ্ঠা দেখুন ও নির্বাচন করুন"
            className="shrink-0 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default"
          >
            <Thumbnail file={item.file} />
          </button>
        ) : (
          <span className={cn(THUMB_BOX, "bg-muted text-muted-foreground")}>
            <FileTextIcon />
          </span>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {(index !== null || item.kind !== "document") && (
            <span className="flex items-center gap-1.5 text-xs font-semibold">
              {index !== null && <span className="text-primary">ফাইল {formatNumber(index)}</span>}
              {item.kind !== "document" && (
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-700 dark:text-emerald-400">{JOB_KIND_LABELS[item.kind]}</span>
              )}
            </span>
          )}
          <div className="truncate font-semibold">{item.file.name}</div>
          {ready ? (
            <div className="text-sm text-muted-foreground">{formatNumber(pageCount)} পৃষ্ঠা</div>
          ) : item.state === "error" ? (
            <div className="text-sm text-destructive">{item.error}</div>
          ) : item.state === "uploading" ? (
            <Progress value={item.progress} className="mt-1 max-w-48" />
          ) : (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Spinner className="size-3.5" />
              {item.state === "analyzing" ? "প্রস্তুত হচ্ছে…" : "অপেক্ষমাণ…"}
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="ফাইলটি সরিয়ে ফেলুন"
          className="shrink-0 self-start rounded-full bg-foreground/[0.06] text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          onClick={onRemove}
          disabled={disabled || item.state === "uploading" || item.state === "analyzing"}
        >
          <XIcon className="size-4" strokeWidth={2.5} />
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
                className="flex w-full items-center gap-3 rounded-xl bg-foreground/[0.04] p-3 text-left transition-colors outline-none hover:bg-foreground/[0.07] focus-visible:ring-3 focus-visible:ring-ring/50 active:bg-foreground/10 disabled:opacity-60"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-primary text-primary-foreground">
                  <ListChecksIcon className="size-[1.125rem]" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm font-semibold">পৃষ্ঠা নির্বাচন</span>
                  <span className="truncate text-sm text-muted-foreground">
                    {options.pages.length
                      ? `${formatPageSelection(options.pages, pageCount)} (${formatNumber(options.pages.length)}টি)`
                      : `সব পৃষ্ঠা (${formatNumber(pageCount)}টি)`}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-0.5 text-sm font-semibold text-primary">
                  Select
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

          {!photoSheet && (
            <ChoiceRow
              label="রং"
              value={options.colorMode}
              disabled={disabled}
              onChange={(colorMode) => set({ colorMode })}
              options={[
                { value: "bw", label: "সাদা-কালো", hint: unitHint(paper, "bw") },
                {
                  value: "color",
                  label: "রঙিন",
                  hint: shop.hasColor ? unitHint(paper, "color") : "উপলব্ধ নয়",
                  disabled: !shop.hasColor,
                },
              ]}
            />
          )}

          {perSheetChoice && (
            <ChoiceRow
              label="প্রতি পাতায় পৃষ্ঠা"
              value={String(options.perSheet)}
              disabled={disabled}
              onChange={(value) => set({ perSheet: Number(value) as PagesPerSheet })}
              options={[
                { value: "1", label: "১টি", hint: "স্বাভাবিক" },
                { value: "2", label: "২টি", hint: "ছোট আকারে" },
                { value: "4", label: "৪টি", hint: "আরও ছোট" },
              ]}
            />
          )}

          {photoSheet ? null : showSides ? (
            <ChoiceRow
              label="প্রিন্টের পাশ"
              value={duplex ? "both" : "single"}
              disabled={disabled}
              onChange={(value) => set({ duplex: value === "both" })}
              options={[
                { value: "single", label: SIDES_LABELS.single, hint: `${formatTaka(paper[options.colorMode])}/পৃষ্ঠা` },
                {
                  value: "both",
                  label: SIDES_LABELS.both,
                  hint: `${formatTaka(unitPrice(paper, options.colorMode, true))}/কাগজ`,
                },
              ]}
            />
          ) : (
            printed > 1 &&
            (shop.duplexSizes.bw.length > 0 || shop.duplexSizes.color.length > 0) && (
              <p className="flex items-center gap-2 px-0.5 text-sm text-muted-foreground">
                <LayersIcon className="size-4 shrink-0" />
                {sidesNote}
              </p>
            )
          )}

          {sizeChoice && (
            <ChoiceRow
              label="কাগজের মাপ"
              value={options.paperSize}
              disabled={disabled}
              onChange={(paperSize) => set({ paperSize })}
              options={shop.papers.map((p) => ({
                value: p.size,
                label: PAPER_SIZE_LABELS[p.size],
                hint: unitHint(p, options.colorMode),
              }))}
            />
          )}

          <div className="flex items-center justify-between gap-3">
            <span className={FIELD_LABEL}>কপি</span>
            <div className="flex items-center rounded-full bg-foreground/[0.06] p-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="size-10 rounded-full hover:bg-background"
                aria-label="কপি কমান"
                disabled={disabled || options.copies <= 1}
                onClick={() => set({ copies: options.copies - 1 })}
              >
                <MinusIcon />
              </Button>
              <span className="w-10 text-center text-lg font-semibold tabular-nums" aria-live="polite">
                {formatNumber(options.copies)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-10 rounded-full hover:bg-background"
                aria-label="কপি বাড়ান"
                disabled={disabled || options.copies >= MAX_COPIES}
                onClick={() => set({ copies: options.copies + 1 })}
              >
                <PlusIcon />
              </Button>
            </div>
          </div>

          <div className="-mx-4 -mb-4 flex items-center justify-between gap-3 border-t border-border/60 bg-muted/50 px-4 py-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold">এই ফাইলের মূল্য</div>
              <div className="text-xs text-muted-foreground">
                {photoSheet ? (
                  <>
                    {formatNumber(pageCount)} পাতা × {formatNumber(options.copies)} কপি × {formatTaka(shop.photoSheetPrice ?? 0)}
                  </>
                ) : (
                  <>
                    {printed !== selected && `${formatNumber(selected)} পৃষ্ঠা, প্রতি পাতায় ${formatNumber(options.perSheet)}টি = `}
                    {duplex
                      ? `${formatNumber(printed)} পৃষ্ঠা = ${formatNumber(sheetCount(printed, true))} কাগজ`
                      : `${formatNumber(printed)} পৃষ্ঠা`}{" "}
                    × {formatNumber(options.copies)} কপি × {formatTaka(unitPrice(paper, options.colorMode, duplex))}
                  </>
                )}
              </div>
            </div>
            <span className="text-xl font-bold tracking-tight tabular-nums">{formatTaka(total)}</span>
          </div>
        </>
      )}
    </div>
  )
}
