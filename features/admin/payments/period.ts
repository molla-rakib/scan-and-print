import { DAYS_PER_MONTH, formatNumber } from "@/lib/constants"

/** "৩ মাস" for whole months, otherwise "৪৫ দিন". */
export function period(days: number) {
  return days % DAYS_PER_MONTH === 0 ? `${formatNumber(days / DAYS_PER_MONTH)} মাস` : `${formatNumber(days)} দিন`
}
