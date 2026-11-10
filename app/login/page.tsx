import type { Metadata } from "next"
import { Suspense } from "react"
import { redirect } from "next/navigation"
import { CircleAlertIcon } from "lucide-react"
import { Logo } from "@/components/logo"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { getCurrentUser } from "@/lib/auth"

export const metadata: Metadata = { title: "লগইন" }

const ERRORS: Record<string, string> = {
  cancelled: "লগইন বাতিল করা হয়েছে। আবার চেষ্টা করুন।",
  invalid: "লগইনের সময় শেষ হয়ে গেছে। আবার চেষ্টা করুন।",
  google: "Google থেকে তথ্য যাচাই করা যায়নি। আবার চেষ্টা করুন।",
}

type Props = { searchParams: Promise<{ error?: string }> }

export default function LoginPage({ searchParams }: Props) {
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

async function LoginError({ searchParams }: Props) {
  const { error } = await searchParams
  if (!error) return null
  return (
    <Alert variant="destructive">
      <CircleAlertIcon />
      <AlertDescription>{ERRORS[error] ?? ERRORS.google}</AlertDescription>
    </Alert>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.93l3.66-2.83z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  )
}
