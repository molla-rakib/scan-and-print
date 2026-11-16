"use client"

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { PAGE_SIZE, pageCount } from "@/lib/list-params"
import { formatNumber } from "@/lib/constants"

/**
 * "২১–৪০ / ১৩৫" plus previous/next for a dashboard table. Renders nothing when everything fits on one page.
 * `page` and `total` come from the server (see lib/list-params.ts).
 */
export function TablePagination({ page, total, prefix = "" }: { page: number; total: number; prefix?: string }) {
  const { goTo, pending } = useTablePagination(prefix)
  const pages = pageCount(total)
  if (total <= PAGE_SIZE && page === 1) return null

  const from = Math.min(total, (page - 1) * PAGE_SIZE + 1)
  const to = Math.min(total, page * PAGE_SIZE)

  return (
    <div className="flex items-center justify-between gap-3 border-t pt-4 text-sm text-muted-foreground">
      <span className="flex items-center gap-2 tabular-nums">
        {pending && <Spinner className="size-4" />}
        {formatNumber(from)}–{formatNumber(to)} / মোট {formatNumber(total)}
      </span>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1 || pending} onClick={() => goTo(page - 1)} aria-label="আগের পৃষ্ঠা">
          <ChevronLeftIcon /> আগের
        </Button>
        <span className="hidden tabular-nums sm:inline">
          পৃষ্ঠা {formatNumber(Math.min(page, pages))} / {formatNumber(pages)}
        </span>
        <Button variant="outline" size="sm" disabled={page >= pages || pending} onClick={() => goTo(page + 1)} aria-label="পরের পৃষ্ঠা">
          পরের <ChevronRightIcon />
        </Button>
      </div>
    </div>
  )
}
