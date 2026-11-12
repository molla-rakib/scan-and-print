import { SettingsIcon } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { SettingsNav } from "./components/settings-nav"

/** Settings shell: the same header + tabs layout as the admin pages. */
export function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageHeader title="সেটিংস" description="দোকানের তথ্য, প্রিন্টের দাম এবং পেমেন্ট পদ্ধতি।" icon={SettingsIcon} tone="sky" />
      <SettingsNav />
      {children}
    </>
  )
}
