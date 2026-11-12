import { Suspense } from "react"
import { redirect } from "next/navigation"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { getCurrentUser } from "@/lib/auth"
import { GoogleIcon } from "./components/google-icon"
import { LoginError } from "./components/login-error"

type Props = { searchParams: Promise<{ error?: string }> }

/** /login: shop owners sign in with Google. */
export function LoginPage({ searchParams }: Props) {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center gap-6 overflow-hidden bg-muted/40 p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,color-mix(in_oklch,var(--primary)_8%,transparent),transparent)]"
      />
      <Logo linkClassName="relative" />
      <Card className="relative w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">দোকান মালিক লগইন</CardTitle>
          <CardDescription>আপনার Gmail অ্যাকাউন্ট দিয়ে এক ক্লিকে লগইন করুন। নতুন হলে দোকান সেটআপ করে নিন।</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Suspense>
            <RedirectIfSignedIn />
            <LoginError searchParams={searchParams} />
          </Suspense>
          <Button
            size="lg"
            variant="outline"
            className="h-11 w-full text-base"
            render={<a href="/api/auth/google" />}
            nativeButton={false}
          >
            <GoogleIcon /> Google দিয়ে লগইন করুন
          </Button>
        </CardContent>
        <CardFooter className="justify-center border-t pt-4 text-center text-xs text-muted-foreground">
          লগইন করার মাধ্যমে আপনি আমাদের সেবার শর্তাবলীতে সম্মত হচ্ছেন।
        </CardFooter>
      </Card>
    </div>
  )
}

/** Already signed in: skip the login screen. */
async function RedirectIfSignedIn() {
  const user = await getCurrentUser()
  if (user) redirect(user.isAdmin ? "/dashboard/admin" : "/dashboard")
  return null
}
