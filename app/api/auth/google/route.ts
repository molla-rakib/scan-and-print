import { NextResponse } from "next/server"
import { createHash } from "node:crypto"
import { randomToken } from "@/lib/crypto"
import { OAUTH_COOKIE, googleAuthUrl } from "@/lib/google"

/** Starts "Sign in with Google": remembers state + PKCE verifier in a short-lived cookie. */
export async function GET(request: Request) {
  const state = randomToken(16)
  const verifier = randomToken(32)
  const challenge = createHash("sha256").update(verifier).digest("base64url")

  const response = NextResponse.redirect(googleAuthUrl(state, challenge))
  response.cookies.set(OAUTH_COOKIE, JSON.stringify({ state, verifier }), {
    httpOnly: true,
    secure: new URL(request.url).protocol === "https:",
    sameSite: "lax",
    path: "/api/auth/google",
    maxAge: 10 * 60,
  })
  return response
}
