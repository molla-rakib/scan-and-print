"use client"

import { StoreIcon, TagIcon, WalletIcon } from "lucide-react"
import { PageTabs } from "@/components/page-tabs"

export function SettingsNav() {
  return (
    <PageTabs
      label="সেটিংস"
      tabs={[
        { href: "/dashboard/settings", label: "দোকানের তথ্য", icon: StoreIcon },
        { href: "/dashboard/settings/pricing", label: "প্রিন্টের দাম", icon: TagIcon },
        { href: "/dashboard/settings/payment", label: "পেমেন্ট", icon: WalletIcon },
      ]}
    />
  )
}
