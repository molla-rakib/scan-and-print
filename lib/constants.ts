// Shared between server and client code.

export const JOB_STATUSES = [
  "draft",
  "pending_payment",
  "awaiting_approval",
  "queued",
  "printing",
  "completed",
  "failed",
  "cancelled",
] as const

export type JobStatus = (typeof JOB_STATUSES)[number]
export type ColorMode = "bw" | "color"
export type PaymentMethod = "bkash" | "cash"

export const ACTIVE_JOB_STATUSES: JobStatus[] = ["queued", "printing"]

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  draft: "খসড়া",
  pending_payment: "পেমেন্টের অপেক্ষায়",
  awaiting_approval: "অনুমোদন প্রয়োজন",
  queued: "লাইনে আছে",
  printing: "প্রিন্ট হচ্ছে",
  completed: "সম্পন্ন",
  failed: "ব্যর্থ",
  cancelled: "বাতিল",
}

export const COLOR_MODE_LABELS: Record<ColorMode, string> = {
  bw: "সাদা-কালো",
  color: "রঙিন",
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  bkash: "বিকাশ",
  cash: "ক্যাশ",
}

/** An agent counts as online if it checked in within this window. */
export const AGENT_ONLINE_WINDOW_MS = 45_000

export const MAX_COPIES = 50

/**
 * Uploads larger than this are sent in pieces of this size: Vercel rejects request bodies over 4.5 MB.
 * The pieces are joined on the server (see /api/public/uploads).
 */
export const UPLOAD_CHUNK_BYTES = 3.5 * 1024 * 1024

/** Random id the browser picks for a piece-by-piece upload. */
export const UPLOAD_ID_PATTERN = /^[A-Za-z0-9_-]{16,64}$/

/** Files one order may hold. */
export const MAX_FILES_PER_ORDER = 20

/** Paper sizes a shop can offer. A4 is always offered; the owner turns the others on with their own prices. */
export const PAPER_SIZES = ["A4", "Legal", "A3"] as const
export type PaperSize = (typeof PAPER_SIZES)[number]
export const EXTRA_PAPER_SIZES = ["Legal", "A3"] as const satisfies readonly PaperSize[]

export const PAPER_SIZE_LABELS: Record<PaperSize, string> = {
  A4: "A4",
  Legal: "লিগ্যাল",
  A3: "A3",
}

export const SIDES_LABELS = { single: "এক পাশে", both: "দুই পাশে" } as const

/**
 * Prices of one paper size: `bw`/`color` per printed page on one side, `bwSheet`/`colorSheet` per sheet
 * printed on both sides (two pages).
 */
export type PaperPrices = { size: PaperSize; bw: number; color: number; bwSheet: number; colorSheet: number }

/** Sheets of paper a job uses per copy: two pages per sheet when printed on both sides. */
export function sheetCount(pages: number, duplex: boolean) {
  return duplex ? Math.ceil(pages / 2) : pages
}

/** Price of one unit: a page on one side, or a sheet when printed on both sides. */
export function unitPrice(paper: PaperPrices, colorMode: ColorMode, duplex: boolean) {
  if (!duplex) return paper[colorMode]
  return colorMode === "color" ? paper.colorSheet : paper.bwSheet
}

/** Total price of a file: units (pages, or sheets for both sides) × copies × unit price. */
export function filePrice(paper: PaperPrices, options: { colorMode: ColorMode; duplex: boolean; copies: number }, pages: number) {
  const units = sheetCount(pages, options.duplex)
  return Math.round(unitPrice(paper, options.colorMode, options.duplex) * units * options.copies * 100) / 100
}

/**
 * Agents older than this print every page on one side of A4, so jobs that pick pages, print both sides
 * or use another paper size only go to newer agents.
 */
export const MIN_AGENT_VERSION_FOR_OPTIONS = "1.1.0"

/** Compares "1.2.3"-style versions (a suffix like "-dev" is ignored). */
export function versionAtLeast(version: string | null | undefined, minimum: string) {
  const parse = (v: string) => v.split("-")[0].split(".").map((part) => Number(part) || 0)
  const [a, b] = [parse(version ?? "0"), parse(minimum)]
  for (let i = 0; i < 3; i++) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) > (b[i] ?? 0)
  }
  return true
}

/** Sorted, de-duplicated page numbers within 1…pageCount. */
export function cleanPages(pages: number[], pageCount: number) {
  return [...new Set(pages.filter((p) => Number.isInteger(p) && p >= 1 && p <= pageCount))].sort((a, b) => a - b)
}

/** [1,2,3,5,7,8] → "1-3,5,7-8" (SumatraPDF's page-range format). */
export function pagesToRanges(pages: number[]) {
  const ranges: string[] = []
  for (let i = 0; i < pages.length; i++) {
    let end = i
    while (end + 1 < pages.length && pages[end + 1] === pages[end] + 1) end++
    ranges.push(end > i ? `${pages[i]}-${pages[end]}` : String(pages[i]))
    i = end
  }
  return ranges.join(",")
}

/**
 * Parses what a customer types, e.g. "1-3, 5" or "১-৩, ৫". Returns null if it can't be read.
 * Pages beyond the document are dropped.
 */
export function parsePageRanges(input: string, pageCount: number): number[] | null {
  const ascii = input.replace(/[০-৯]/g, (d) => String(d.charCodeAt(0) - 0x09e6)).replace(/[–—]/g, "-")
  const pages: number[] = []
  for (const part of ascii.split(/[,\s]+/).filter(Boolean)) {
    const match = /^(\d+)(?:-(\d+))?$/.exec(part)
    if (!match) return null
    const start = Number(match[1])
    const end = Number(match[2] ?? match[1])
    if (start < 1 || end < start) return null
    for (let p = start; p <= Math.min(end, pageCount); p++) pages.push(p)
  }
  return cleanPages(pages, pageCount)
}

/** Bangla summary of a page selection: "সব পৃষ্ঠা" or "১-৩, ৫". An empty list means every page. */
export function formatPageSelection(pages: number[], pageCount: number) {
  if (pages.length === 0 || pages.length === pageCount) return "সব পৃষ্ঠা"
  return pagesToRanges(pages)
    .split(",")
    .map((range) => range.split("-").map(Number).map(formatNumber).join("-"))
    .join(", ")
}

// The Windows print agent, published by agent/release.ps1. It installs itself when run.
export const AGENT_DOWNLOAD_URL = "/downloads/ScanAndPrintAgent.exe"

/** Formats a number with Bangla digits, e.g. 120 → "১২০". */
export function formatNumber(value: number) {
  return value.toLocaleString("bn-BD", { maximumFractionDigits: 2 })
}

export function formatTaka(amount: number) {
  return `৳${formatNumber(amount)}`
}

export function formatToken(token: number) {
  return `#${formatNumber(token)}`
}

export function formatDateTime(value: Date | string) {
  return new Date(value).toLocaleString("bn-BD", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dhaka" })
}

export function formatDate(value: Date | string) {
  return new Date(value).toLocaleDateString("bn-BD", { dateStyle: "medium", timeZone: "Asia/Dhaka" })
}

/**
 * Normalises a Bangladeshi mobile number ("+880 1712-345678", "০১৭১২৩৪৫৬৭৮" …) to "01712345678".
 * Returns null if it is not a valid mobile number.
 */
export function normalizeBdPhone(input: string): string | null {
  const ascii = input.replace(/[০-৯]/g, (d) => String(d.charCodeAt(0) - 0x09e6))
  const digits = ascii.replace(/[\s\-()]/g, "").replace(/^\+?88/, "")
  return /^01[3-9]\d{8}$/.test(digits) ? digits : null
}
