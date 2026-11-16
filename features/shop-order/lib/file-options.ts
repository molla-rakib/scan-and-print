import { PAPER_SIZE_LABELS, filePrice, type ColorMode, type PaperSize } from "@/lib/constants"
import type { PublicShopView } from "@/lib/public-shop"

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

export function paperOf(shop: PublicShopView, options: PrintOptions) {
  return shop.papers.find((p) => p.size === options.paperSize) ?? shop.papers[0]
}

export function printedPages(item: FileItem) {
  return item.options.pages.length || item.pageCount || 0
}

/** Whether a printer in the shop can print both sides in this color on this paper size. */
export function duplexOffered(shop: PublicShopView, colorMode: ColorMode, size: PaperSize) {
  return shop.duplexSizes[colorMode].includes(size)
}

/** Whether both sides can be chosen for this file: more than one page, and a printer that can do it. */
export function duplexAvailable(shop: PublicShopView, item: FileItem) {
  return printedPages(item) > 1 && duplexOffered(shop, item.options.colorMode, item.options.paperSize)
}

/** Why "both sides" isn't offered for these options, when the shop does print both sides on something. */
export function sidesNote(shop: PublicShopView, options: PrintOptions) {
  const size = PAPER_SIZE_LABELS[options.paperSize]
  if (options.colorMode === "color" && duplexOffered(shop, "bw", options.paperSize)) return "রঙিন প্রিন্ট শুধু কাগজের এক পাশে হয়"
  return `${size} কাগজে শুধু এক পাশে প্রিন্ট হয়`
}

/** The options as they will be ordered: "both sides" is dropped when it no longer applies. */
export function effectiveOptions(shop: PublicShopView, item: FileItem): PrintOptions {
  return { ...item.options, duplex: item.options.duplex && duplexAvailable(shop, item) }
}

export function fileTotal(shop: PublicShopView, item: FileItem) {
  const options = effectiveOptions(shop, item)
  return filePrice(paperOf(shop, options), options, printedPages(item))
}
