"use server"

import { refresh } from "next/cache"
import { z } from "zod"
import { fail, type ActionResult } from "@/lib/action-result"
import { requireAdmin } from "@/lib/auth"
import { getBillingSettings } from "@/lib/billing"
import { BkashError, testBkashCredentials } from "@/lib/bkash"
import { normalizeBdPhone } from "@/lib/constants"
import { decrypt, encrypt } from "@/lib/crypto"
import { EpsError, testEpsCredentials } from "@/lib/eps"

const manualSchema = z.object({
  enabled: z.boolean(),
  bkashNumber: z.string().trim(),
  nagadNumber: z.string().trim(),
  instructions: z.string().trim().max(300),
})

export async function updateManualBilling(input: z.input<typeof manualSchema>): Promise<ActionResult> {
  await requireAdmin()
  const parsed = manualSchema.safeParse(input)
  if (!parsed.success) return fail("তথ্য সঠিক নয়।")
  const data = parsed.data
  const bkashNumber = data.bkashNumber ? normalizeBdPhone(data.bkashNumber) : ""
  const nagadNumber = data.nagadNumber ? normalizeBdPhone(data.nagadNumber) : ""
  if (bkashNumber === null) return fail("বিকাশ নম্বরটি সঠিক নয়।")
  if (nagadNumber === null) return fail("নগদ নম্বরটি সঠিক নয়।")
  if (data.enabled && !bkashNumber && !nagadNumber) return fail("চালু করতে অন্তত একটি নম্বর দিন।")

  const settings = await getBillingSettings()
  settings.set({ manual: { enabled: data.enabled, bkashNumber, nagadNumber, instructions: data.instructions } })
  await settings.save()
  refresh()
  return { ok: true }
}

const bkashSchema = z.object({
  enabled: z.boolean(),
  sandbox: z.boolean(),
  username: z.string().trim(),
  appKey: z.string().trim(),
  // Blank keeps the saved secret.
  password: z.string(),
  appSecret: z.string(),
})

export async function updateBkashBilling(input: z.input<typeof bkashSchema>): Promise<ActionResult> {
  await requireAdmin()
  const parsed = bkashSchema.safeParse(input)
  if (!parsed.success) return fail("বিকাশ সেটিংস সঠিক নয়।")
  const data = parsed.data
  const settings = await getBillingSettings()
  const saved = settings.bkash
  const password = data.password || (saved.passwordEnc ? decrypt(saved.passwordEnc) : "")
  const appSecret = data.appSecret || (saved.appSecretEnc ? decrypt(saved.appSecretEnc) : "")

  if (data.enabled) {
    if (!data.username || !data.appKey || !password || !appSecret) return fail("চালু করতে চারটি ক্রেডেনশিয়ালই পূরণ করুন।")
    try {
      await testBkashCredentials({ sandbox: data.sandbox, username: data.username, appKey: data.appKey, password, appSecret })
    } catch (error) {
      return fail(error instanceof BkashError ? `বিকাশ এই ক্রেডেনশিয়াল গ্রহণ করেনি: ${error.message}` : "ক্রেডেনশিয়াল যাচাই করা যায়নি।")
    }
  }

  settings.set({
    bkash: {
      enabled: data.enabled,
      sandbox: data.sandbox,
      username: data.username,
      appKey: data.appKey,
      passwordEnc: password ? encrypt(password) : "",
      appSecretEnc: appSecret ? encrypt(appSecret) : "",
    },
  })
  await settings.save()
  refresh()
  return { ok: true }
}

const epsSchema = z.object({
  enabled: z.boolean(),
  sandbox: z.boolean(),
  merchantId: z.string().trim(),
  storeId: z.string().trim(),
  username: z.string().trim(),
  // Blank keeps the saved secret.
  password: z.string(),
  hashKey: z.string(),
})

export async function updateEpsBilling(input: z.input<typeof epsSchema>): Promise<ActionResult> {
  await requireAdmin()
  const parsed = epsSchema.safeParse(input)
  if (!parsed.success) return fail("EPS সেটিংস সঠিক নয়।")
  const data = parsed.data
  const settings = await getBillingSettings()
  const saved = settings.eps
  const password = data.password || (saved.passwordEnc ? decrypt(saved.passwordEnc) : "")
  const hashKey = data.hashKey || (saved.hashKeyEnc ? decrypt(saved.hashKeyEnc) : "")

  if (data.enabled) {
    if (!data.merchantId || !data.storeId || !data.username || !password || !hashKey) return fail("চালু করতে সবগুলো ঘর পূরণ করুন।")
    try {
      await testEpsCredentials({ sandbox: data.sandbox, merchantId: data.merchantId, storeId: data.storeId, username: data.username, password, hashKey })
    } catch (error) {
      return fail(error instanceof EpsError ? `EPS এই ক্রেডেনশিয়াল গ্রহণ করেনি: ${error.message}` : "ক্রেডেনশিয়াল যাচাই করা যায়নি।")
    }
  }

  settings.set({
    eps: {
      enabled: data.enabled,
      sandbox: data.sandbox,
      merchantId: data.merchantId,
      storeId: data.storeId,
      username: data.username,
      passwordEnc: password ? encrypt(password) : "",
      hashKeyEnc: hashKey ? encrypt(hashKey) : "",
    },
  })
  await settings.save()
  refresh()
  return { ok: true }
}
