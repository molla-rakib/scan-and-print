"use server"

import { z } from "zod"
import { fail, type ActionResult } from "@/lib/action-result"
import { requireUser } from "@/lib/auth"
import { MAX_BILLING_DEVICES } from "@/lib/constants"
import { connectDb } from "@/lib/db"
import { env } from "@/lib/env"
import { Shop } from "@/lib/models"
import { firstError, profileSchema, slugTaken } from "@/lib/shop-profile"

// Onboarding also asks how many devices (printers / copiers) the shop will connect; the trial starts with that limit.
const newShopSchema = profileSchema.extend({ devices: z.number().int().min(1).max(MAX_BILLING_DEVICES) })

export async function createShop(input: z.input<typeof newShopSchema>): Promise<ActionResult> {
  const user = await requireUser()
  const parsed = newShopSchema.safeParse(input)
  if (!parsed.success) return fail(firstError(parsed.error))

  await connectDb()
  // The client navigates to the dashboard on success (a redirect here would surface as an error in useAction).
  if (await Shop.exists({ ownerId: user.id })) return { ok: true }
  if (await slugTaken(parsed.data.slug)) return fail("এই লিংকটি আগেই নেওয়া হয়েছে।")

  const { devices, ...profile } = parsed.data
  await Shop.create({
    ...profile,
    ownerId: user.id,
    deviceLimit: devices,
    paidUntil: new Date(Date.now() + env.trialDays * 24 * 60 * 60 * 1000),
  })
  return { ok: true }
}
