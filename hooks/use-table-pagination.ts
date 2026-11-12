"use client"

import { useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

/** Moves a dashboard table to another page by setting `?<prefix>page=`, keeping the other URL params. */
export function useTablePagination(prefix = "") {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [pending, startTransition] = useTransition()

  function goTo(page: number) {
    const next = new URLSearchParams(params.toString())
    if (page > 1) next.set(`${prefix}page`, String(page))
    else next.delete(`${prefix}page`)
    const query = next.toString()
    startTransition(() => router.push(query ? `${pathname}?${query}` : pathname, { scroll: false }))
  }

  return { goTo, pending }
}
