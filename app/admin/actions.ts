"use server"

import { refresh } from "next/cache"
import { isValidObjectId } from "mongoose"
import { fail, type ActionResult } from "@/lib/action-result"
import { requireAdmin } from "@/lib/auth"
import { Shop } from "@/lib/models"

async function findShop(shopId: string) {
  await requireAdmin()
  return isValidObjectId(shopId) ? Shop.findById(shopId) : null
}

export async function setDeviceLimit(shopId: string, limit: number): Promise<ActionResult> {
  const shop = await findShop(shopId)
  if (!shop) return fail("দোকান পাওয়া যায়নি।")
  if (!Number.isInteger(limit) || limit < 0 || limit > 100) return fail("সঠিক সংখ্যা দিন।")
  shop.deviceLimit = limit
  await shop.save()
  refresh()
  return { ok: true }
}

/** Records a payment: extends the subscription by `days` from today or from the current end date, whichever is later. */
export async function extendSubscription(shopId: string, days: number): Promise<ActionResult> {
  const shop = await findShop(shopId)
  if (!shop) return fail("দোকান পাওয়া যায়নি।")
  if (!Number.isInteger(days) || days < 1 || days > 366) return fail("সঠিক দিন সংখ্যা দিন।")
  const from = Math.max(Date.now(), shop.paidUntil.getTime())
  shop.paidUntil = new Date(from + days * 24 * 60 * 60 * 1000)
  await shop.save()
  refresh()
  return { ok: true }
}

export async function setShopStatus(shopId: string, status: "active" | "suspended"): Promise<ActionResult> {
  const shop = await findShop(shopId)
  if (!shop) return fail("দোকান পাওয়া যায়নি।")
  shop.status = status
  await shop.save()
  refresh()
  return { ok: true }
}
