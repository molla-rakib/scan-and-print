"use server"

import { refresh } from "next/cache"
import { z } from "zod"
import { fail, type ActionResult } from "@/lib/action-result"
import { requireShop } from "@/lib/auth"
import { BkashError, testBkashCredentials } from "@/lib/bkash"
import { decrypt, encrypt } from "@/lib/crypto"
import { firstError, profileSchema, slugTaken } from "@/lib/shop-profile"

export async function updateShopProfile(input: z.input<typeof profileSchema>): Promise<ActionResult> {
  const { shop } = await requireShop()
  const parsed = profileSchema.safeParse(input)
  if (!parsed.success) return fail(firstError(parsed.error))
  if (await slugTaken(parsed.data.slug, shop._id)) return fail("এই লিংকটি আগেই নেওয়া হয়েছে।")

  shop.set(parsed.data)
  await shop.save()
  refresh()
  return { ok: true }
}

const price = z.number().min(0).max(1000)
// One side: per page. Both sides: per sheet (two pages).
const paperPriceFields = { bw: price, color: price, bwSheet: price, colorSheet: price }
const extraPaperSchema = z.object({ enabled: z.boolean(), ...paperPriceFields })

// A4 prices plus the optional Legal and A3 sizes.
const pricingSchema = z.object({
  ...paperPriceFields,
  colorDuplex: z.boolean(),
  paperSizes: z.object({ Legal: extraPaperSchema, A3: extraPaperSchema }),
})

export async function updatePricing(input: z.input<typeof pricingSchema>): Promise<ActionResult> {
  const { shop } = await requireShop()
  const parsed = pricingSchema.safeParse(input)
  if (!parsed.success) return fail("সঠিক দাম দিন।")

  const { paperSizes, ...a4 } = parsed.data
  shop.set({ pricing: a4, paperSizes })
  await shop.save()
  refresh()
  return { ok: true }
}

/* --------------------------------- Payments -------------------------------- */

const cashSchema = z
  .object({ enabled: z.boolean(), askName: z.boolean(), askPhone: z.boolean() })
  .refine((cash) => cash.askName || cash.askPhone, "নাম বা মোবাইল নম্বর — অন্তত একটি চালু রাখতে হবে।")

export async function updateCashSettings(input: z.input<typeof cashSchema>): Promise<ActionResult> {
  const { shop } = await requireShop()
  const parsed = cashSchema.safeParse(input)
  if (!parsed.success) return fail(firstError(parsed.error))
  shop.set({ cash: parsed.data })
  await shop.save()
  refresh()
  return { ok: true }
}

const bkashSchema = z.object({
  enabled: z.boolean(),
  sandbox: z.boolean(),
  username: z.string().trim().max(200),
  appKey: z.string().trim().max(200),
  // Empty means "keep the saved value".
  password: z.string().trim().max(200),
  appSecret: z.string().trim().max(300),
})

export async function updateBkash(input: z.input<typeof bkashSchema>): Promise<ActionResult> {
  const { shop } = await requireShop()
  const parsed = bkashSchema.safeParse(input)
  if (!parsed.success) return fail("বিকাশ সেটিংস সঠিক নয়।")
  const data = parsed.data

  const password = data.password || (shop.bkash.passwordEnc ? decrypt(shop.bkash.passwordEnc) : "")
  const appSecret = data.appSecret || (shop.bkash.appSecretEnc ? decrypt(shop.bkash.appSecretEnc) : "")
  const complete = Boolean(data.username && data.appKey && password && appSecret)

  if (data.enabled) {
    if (!complete) return fail("বিকাশ পেমেন্ট চালু করতে চারটি ক্রেডেনশিয়ালই পূরণ করুন।")
    try {
      await testBkashCredentials({ sandbox: data.sandbox, username: data.username, appKey: data.appKey, password, appSecret })
    } catch (error) {
      return fail(error instanceof BkashError ? `বিকাশ এই ক্রেডেনশিয়াল গ্রহণ করেনি: ${error.message}` : "ক্রেডেনশিয়াল যাচাই করা যায়নি।")
    }
  }

  shop.set({
    bkash: {
      enabled: data.enabled,
      sandbox: data.sandbox,
      username: data.username,
      appKey: data.appKey,
      passwordEnc: password ? encrypt(password) : "",
      appSecretEnc: appSecret ? encrypt(appSecret) : "",
    },
  })
  await shop.save()
  refresh()
  return { ok: true }
}
