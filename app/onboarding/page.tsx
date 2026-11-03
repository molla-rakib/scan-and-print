import type { Metadata } from "next"
import { Suspense } from "react"
import { redirect } from "next/navigation"
import { Logo } from "@/components/logo"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { requireUser } from "@/lib/auth"
import { Shop } from "@/lib/models"
import { OnboardingForm } from "./onboarding-form"

export const metadata: Metadata = { title: "দোকান সেটআপ" }

export default function OnboardingPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/40 p-6">
      <Logo />
      <Card className="w-full max-w-md">
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
  if (await Shop.exists({ ownerId: user.id })) redirect("/dashboard")
  return <OnboardingForm />
}
