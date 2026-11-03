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
