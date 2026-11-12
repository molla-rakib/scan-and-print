import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { env } from "@/lib/env"
import { ProfileForm } from "./components/profile-form"
import { getProfileSettings } from "./queries"

/** /dashboard/settings: the shop's name, link, address and phone. */
export function ShopSettingsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[300px]" />}>
      <ShopSection />
    </Suspense>
  )
}

async function ShopSection() {
  return <ProfileForm appUrl={env.appUrl} initial={await getProfileSettings()} />
}
