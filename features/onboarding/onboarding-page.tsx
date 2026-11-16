import { Suspense } from "react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Logo } from "@/components/logo"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { requireUser } from "@/lib/auth"
import { env } from "@/lib/env"
import { OnboardingForm } from "./components/onboarding-form"
import { userHasShop } from "./queries"

/**
 * /onboarding: a new owner sets up their shop. The form needs only build-time values (fee, trial days,
 * default device count), so it is part of the prerendered page and shows at once, with nothing to wait for.
 * The per-user check runs on its own: no session → /login, already has a shop → /dashboard; for admins (who
 * may not want a shop) it adds a link to skip to the admin panel.
 */
export function OnboardingPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/40 p-6">
      <Logo />
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-xl">আপনার দোকান সেটআপ করুন</CardTitle>
          <CardDescription>গ্রাহক QR কোড স্ক্যান করলে এই তথ্য দেখবে। পরে যেকোনো সময় পরিবর্তন করতে পারবেন।</CardDescription>
        </CardHeader>
        <CardContent>
          <OnboardingForm deviceFee={env.deviceMonthlyFee} trialDays={env.trialDays} defaultDevices={env.trialDeviceLimit} />
        </CardContent>
      </Card>
      <Suspense fallback={null}>
        <LeaveIfNotNeeded />
      </Suspense>
    </div>
  )
}

async function LeaveIfNotNeeded() {
  const user = await requireUser()
  if (await userHasShop(user.id)) redirect(user.isAdmin ? "/dashboard/admin" : "/dashboard")
  if (!user.isAdmin) return null
  return (
    <Link href="/dashboard/admin" className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
      এখন না, অ্যাডমিন প্যানেলে যান
    </Link>
  )
}
