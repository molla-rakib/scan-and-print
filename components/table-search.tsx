"use client"

import { SearchIcon, XIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { useTableSearch } from "@/hooks/use-table-search"
import { cn } from "@/lib/utils"

/** Search box for a dashboard table. Updates `?<prefix>q=` as the user types and goes back to page 1. */
export function TableSearch({ placeholder, prefix = "", className }: { placeholder: string; prefix?: string; className?: string }) {
  const { value, setValue, clear, pending } = useTableSearch(prefix)

  return (
    <div className={cn("relative w-full sm:max-w-xs", className)}>
      <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-10 pr-9 pl-9 [&::-webkit-search-cancel-button]:hidden"
      />
      <span className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center">
        {pending ? (
          <Spinner className="size-4 text-muted-foreground" />
        ) : (
          value && (
            <button
              type="button"
              onClick={clear}
              aria-label="খোঁজা মুছুন"
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <XIcon className="size-4" />
            </button>
          )
        )}
      </span>
    </div>
  )
}
