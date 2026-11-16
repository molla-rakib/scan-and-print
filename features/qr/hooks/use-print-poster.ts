"use client"

/** Opens the browser's print dialog; print styles show only the poster card. */
export function usePrintPoster() {
  return { print: () => window.print() }
}
