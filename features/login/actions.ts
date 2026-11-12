"use server"

import type { ActionResult } from "@/lib/action-result"
import { deleteSession } from "@/lib/session"

/**
 * Ends the session. The browser then opens /login itself: a redirect() here would reach the client as a
 * thrown error (see CLAUDE.md, "Server actions").
 */
export async function logout(): Promise<ActionResult> {
  await deleteSession()
  return { ok: true }
}
