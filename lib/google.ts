import "server-only"
import { decodeJwt } from "jose"
import { env } from "@/lib/env"

// Google OAuth 2.0 (authorization code flow with PKCE).
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
const TOKEN_URL = "https://oauth2.googleapis.com/token"

export const OAUTH_COOKIE = "sp_oauth"

export function googleRedirectUri() {
  return `${env.appUrl}/api/auth/google/callback`
}

export function googleAuthUrl(state: string, codeChallenge: string) {
  const params = new URLSearchParams({
    client_id: env.google.clientId,
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  })
  return `${AUTH_URL}?${params}`
}

export type GoogleProfile = { email: string; name: string; picture?: string }

/** Exchanges the authorization code for the user's verified Google profile. */
export async function exchangeGoogleCode(code: string, codeVerifier: string): Promise<GoogleProfile | null> {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      code_verifier: codeVerifier,
      client_id: env.google.clientId,
      client_secret: env.google.clientSecret,
      redirect_uri: googleRedirectUri(),
      grant_type: "authorization_code",
    }),
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) return null

  const { id_token: idToken } = (await response.json()) as { id_token?: string }
  if (!idToken) return null

  // The token came straight from Google's token endpoint over TLS, so its claims can be
  // trusted without verifying the signature; we still check who it was issued for.
  const claims = decodeJwt(idToken)
  const validIssuer = claims.iss === "https://accounts.google.com" || claims.iss === "accounts.google.com"
  if (!validIssuer || claims.aud !== env.google.clientId) return null
  if (typeof claims.email !== "string" || claims.email_verified !== true) return null

  return {
    email: claims.email.toLowerCase(),
    name: typeof claims.name === "string" ? claims.name : "",
    picture: typeof claims.picture === "string" ? claims.picture : undefined,
  }
}
