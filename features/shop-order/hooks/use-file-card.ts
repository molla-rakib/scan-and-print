"use client"

import { useState } from "react"
import { formatTaka, unitPrice, type ColorMode, type PaperPrices } from "@/lib/constants"
import type { PublicShopView } from "@/lib/public-shop"
import {
  duplexAvailable,
  duplexOffered,
  effectiveOptions,
  fileTotal,
  paperOf,
  printedPages,
  sidesNote,
  type FileItem,
  type PrintOptions,
} from "../lib/file-options"

/** One file's print options, its page picker and its price. */
export function useFileCard(item: FileItem, shop: PublicShopView, disabled: boolean, onChange: (options: PrintOptions) => void) {
  const [picking, setPicking] = useState(false)
  const { options } = item
  const set = (patch: Partial<PrintOptions>) => onChange({ ...options, ...patch })
  const ready = item.state === "ready" && item.pageCount
  const pageCount = item.pageCount ?? 0
  const canPick = ready && pageCount > 1 && !disabled
  const paper = paperOf(shop, options)
  const showSides = duplexAvailable(shop, item)
  const { duplex } = effectiveOptions(shop, item)
  // Price of one unit for a color mode or paper size: per page on one side, per sheet on both sides.
  const unitHint = (p: PaperPrices, colorMode: ColorMode) => {
    const sheet = duplex && duplexOffered(shop, colorMode, p.size)
    return `${formatTaka(unitPrice(p, colorMode, sheet))}/${sheet ? "কাগজ" : "পৃষ্ঠা"}`
  }

  return {
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
    printed: printedPages(item),
    total: fileTotal(shop, item),
    sidesNote: sidesNote(shop, options),
  }
}
