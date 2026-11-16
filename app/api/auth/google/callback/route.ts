import { NextResponse, type NextRequest } from "next/server"
import { homePathFor } from "@/lib/auth"
import { connectDb } from "@/lib/db"
import { env } from "@/lib/env"
import { OAUTH_COOKIE, exchangeGoogleCode } from "@/lib/google"
import { User } from "@/lib/models"
import { createSession } from "@/lib/session"

/** Google redirects here after the user picks an account. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const fail = (reason: string) => NextResponse.redirect(`${env.appUrl}/login?error=${reason}`)

  let saved: { state?: string; verifier?: string } = {}
  try {
    saved = JSON.parse(request.cookies.get(OAUTH_COOKIE)?.value ?? "{}")
  } catch {}

  if (params.get("error")) return fail("cancelled")
  const code = params.get("code")
  if (!code || !saved.state || !saved.verifier || params.get("state") !== saved.state) return fail("invalid")

  const profile = await exchangeGoogleCode(code, saved.verifier).catch(() => null)
  if (!profile) return fail("google")

  await connectDb()
  const user = await User.findOneAndUpdate(
    { email: profile.email },
    { $set: { lastLoginAt: new Date(), name: profile.name } },
    { upsert: true, returnDocument: "after" }
  )
  await createSession({ userId: user.id, email: user.email })

  const response = NextResponse.redirect(`${env.appUrl}${await homePathFor({ id: user.id, email: user.email })}`)
  response.cookies.delete({ name: OAUTH_COOKIE, path: "/api/auth/google" })
  return response
}
