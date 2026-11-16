"use client"

import { ReceiptTextIcon, SettingsIcon, StoreIcon } from "lucide-react"
import { PageTabs } from "@/components/page-tabs"

/** Tabs between the admin pages; the payments tab shows how many manual payments wait for approval. */
export function AdminNav({ pending }: { pending: number }) {
  return (
    <PageTabs
      label="অ্যাডমিন"
      tabs={[
        { href: "/dashboard/admin", label: "দোকান", icon: StoreIcon },
        { href: "/dashboard/admin/payments", label: "পেমেন্ট", icon: ReceiptTextIcon, count: pending },
        { href: "/dashboard/admin/payment-setup", label: "পেমেন্ট সেটআপ", icon: SettingsIcon },
      ]}
    />
  )
}
