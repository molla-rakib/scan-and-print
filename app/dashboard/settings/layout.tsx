import { SettingsIcon } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { SettingsNav } from "./settings-nav"

/**
 * Settings shell: one panel with the section menu (left column on desktop, tabs on phones)
 * joined to the open section.
 */
export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageHeader title="সেটিংস" description="দোকানের তথ্য, প্রিন্টের দাম এবং পেমেন্ট পদ্ধতি।" icon={SettingsIcon} tone="sky" />
      <div className="flex flex-col overflow-hidden rounded-lg border bg-card shadow-xs lg:min-h-[560px] lg:flex-row">
        <SettingsNav />
        <div className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          {/* Only a line between two sections: streamed pages can end with hidden elements, so no divide-y/last-child. */}
          <div className="flex max-w-3xl flex-col [&>[data-slot=card]+[data-slot=card]]:mt-8 [&>[data-slot=card]+[data-slot=card]]:border-t [&>[data-slot=card]+[data-slot=card]]:pt-8!">
            {children}
          </div>
        </div>
      </div>
    </>
  )
}
