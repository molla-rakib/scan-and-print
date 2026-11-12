import type { Metadata } from "next"
import { ShopSettingsPage } from "@/features/settings/shop-settings-page"

export const metadata: Metadata = { title: "দোকানের তথ্য · সেটিংস" }

export default function Page() {
  return <ShopSettingsPage />
}
