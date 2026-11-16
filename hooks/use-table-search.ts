"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

const DEBOUNCE_MS = 350

/** State behind `TableSearch`: the typed text, written to the URL after a short pause in typing. */
export function useTableSearch(prefix = "") {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const key = `${prefix}q`
  const [value, setValueState] = useState(params.get(key) ?? "")
  const [pending, startTransition] = useTransition()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), [])

  function apply(text: string) {
    const next = new URLSearchParams(params.toString())
    if (text.trim()) next.set(key, text.trim())
    else next.delete(key)
    next.delete(`${prefix}page`)
    const query = next.toString()
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }))
  }

  function setValue(text: string) {
    setValueState(text)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => apply(text), DEBOUNCE_MS)
  }

  function clear() {
    setValueState("")
    if (timer.current) clearTimeout(timer.current)
    apply("")
  }

  return { value, setValue, clear, pending }
}
