import { Suspense } from "react"
import { redirect } from "next/navigation"
import { Logo } from "@/components/logo"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { requireUser } from "@/lib/auth"
import { env } from "@/lib/env"
import { OnboardingForm } from "./components/onboarding-form"
import { userHasShop } from "./queries"

/** /onboarding: a new owner sets up their shop. Owners who already have one go to the dashboard. */
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
          <Suspense fallback={<Skeleton className="h-64" />}>
            <EnsureNoShop />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}

async function EnsureNoShop() {
  const user = await requireUser()
  if (await userHasShop(user.id)) redirect("/dashboard")
  return <OnboardingForm deviceFee={env.deviceMonthlyFee} trialDays={env.trialDays} defaultDevices={env.trialDeviceLimit} />
}
