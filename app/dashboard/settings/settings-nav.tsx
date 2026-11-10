"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { StoreIcon, TagIcon, WalletIcon } from "lucide-react"
import { cn } from "@/lib/utils"

const SECTIONS = [
  { href: "/dashboard/settings", label: "দোকানের তথ্য", icon: StoreIcon },
  { href: "/dashboard/settings/pricing", label: "প্রিন্টের দাম", icon: TagIcon },
  { href: "/dashboard/settings/payment", label: "পেমেন্ট", icon: WalletIcon },
]

export function SettingsNav() {
  const pathname = usePathname()
  return (
    <nav
      aria-label="সেটিংস"
      className="flex shrink-0 gap-1 overflow-x-auto border-b bg-muted/30 p-2 lg:w-60 lg:flex-col lg:overflow-visible lg:border-r lg:border-b-0 lg:p-3"
    >
      {SECTIONS.map(({ href, label, icon: Icon }) => {
        const active = href === "/dashboard/settings" ? pathname === href : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2 text-sm whitespace-nowrap transition-colors",
              active ? "bg-primary/10 font-medium text-primary" : "text-foreground/80 hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className={cn("size-4 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
