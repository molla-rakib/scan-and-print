import "server-only"
import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"
import { env } from "@/lib/env"
import { SESSION_COOKIE } from "@/lib/session-cookie"

const SESSION_DAYS = 30

type SessionPayload = { userId: string; email: string }

function secret() {
  return new TextEncoder().encode(env.sessionSecret)
}

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT({ email: payload.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret())

  ;(await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  })
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] })
    if (!payload.sub || typeof payload.email !== "string") return null
    return { userId: payload.sub, email: payload.email }
  } catch {
    return null
  }
}

export async function deleteSession() {
  ;(await cookies()).delete(SESSION_COOKIE)
}
