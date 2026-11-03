import "server-only"
import { NextResponse } from "next/server"
import type { z } from "zod"
import { connectDb } from "@/lib/db"
import { sha256 } from "@/lib/crypto"
import { Agent } from "@/lib/models"

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export async function parseBody<T extends z.ZodType>(request: Request, schema: T): Promise<z.infer<T> | null> {
  const body = await request.json().catch(() => null)
  const result = schema.safeParse(body)
  return result.success ? result.data : null
}

/** Authenticates a shop agent by its bearer token and records that it is online. */
export async function authenticateAgent(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!token) return null
  await connectDb()
  return Agent.findOneAndUpdate({ tokenHash: sha256(token) }, { $set: { lastSeenAt: new Date() } }, { returnDocument: "after" })
}
