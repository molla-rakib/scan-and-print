import { CircleAlertIcon } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

const ERRORS: Record<string, string> = {
  cancelled: "লগইন বাতিল করা হয়েছে। আবার চেষ্টা করুন।",
  invalid: "লগইনের সময় শেষ হয়ে গেছে। আবার চেষ্টা করুন।",
  google: "Google থেকে তথ্য যাচাই করা যায়নি। আবার চেষ্টা করুন।",
}

/** Why the last Google sign-in failed (?error=… from the OAuth callback). */
export async function LoginError({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  if (!error) return null
  return (
    <Alert variant="destructive">
      <CircleAlertIcon />
      <AlertDescription>{ERRORS[error] ?? ERRORS.google}</AlertDescription>
    </Alert>
  )
}
