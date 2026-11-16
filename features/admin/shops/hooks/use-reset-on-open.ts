"use client"

import { useState } from "react"

/** Calls `reset` (during render, before the dialog shows) each time `open` turns true, so a dialog starts fresh. */
export function useResetOnOpen(open: boolean, reset: () => void) {
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) reset()
  }
}
