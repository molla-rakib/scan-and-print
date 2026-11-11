"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { LucideIcon } from "lucide-react"
import { formatNumber } from "@/lib/constants"
import { cn } from "@/lib/utils"

export type PageTab = {
  href: string
  label: string
  icon: LucideIcon
  /** A count shown as a badge, e.g. items waiting. Hidden when 0. */
  count?: number
}

/**
 * Underlined tabs between the pages of one section (settings, admin). The first tab is active only on its
 * exact path; the others also on their sub-pages. Scrolls sideways on phones.
 */
export function PageTabs({ tabs, label }: { tabs: PageTab[]; label: string }) {
  const pathname = usePathname()
  return (
    // The baseline is an inset shadow (not a border the tabs overlap with -mb-px), so nothing overflows
    // vertically; the sideways scrollbar on phones is hidden but swiping still works.
    <nav
      aria-label={label}
      className="-mx-4 flex gap-1 overflow-x-auto px-4 shadow-[inset_0_-1px_0_var(--color-border)] [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
    >
      {tabs.map(({ href, label, icon: Icon, count }, i) => {
        const active = i === 0 ? pathname === href : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm whitespace-nowrap transition-colors",
              active ? "border-primary font-medium text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="size-4" />
            {label}
            {!!count && (
              <span className="rounded-full bg-amber-500 px-1.5 text-xs font-semibold text-white tabular-nums">{formatNumber(count)}</span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
