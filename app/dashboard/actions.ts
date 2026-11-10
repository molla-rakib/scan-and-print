"use server"

import { refresh } from "next/cache"
import { isValidObjectId } from "mongoose"
import { z } from "zod"
import { fail, type ActionResult } from "@/lib/action-result"
import { requireShop, requireUser } from "@/lib/auth"
import { BkashError, testBkashCredentials } from "@/lib/bkash"
import { encrypt, decrypt, randomCode } from "@/lib/crypto"
import { connectDb } from "@/lib/db"
import { env } from "@/lib/env"
import { discardJobFile, queueJob } from "@/lib/jobs"
import { Agent, Device, PrintJob, Shop } from "@/lib/models"

const RESERVED_SLUGS = new Set(["admin", "api", "dashboard", "login", "onboarding", "s", "j", "app", "www"])

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/, "৩–৪০টি ইংরেজি ছোট হাতের অক্ষর, সংখ্যা বা ড্যাশ ব্যবহার করুন।")
  .refine((slug) => !RESERVED_SLUGS.has(slug), "এই লিংকটি সংরক্ষিত। অন্য একটি চেষ্টা করুন।")

const profileSchema = z.object({
  name: z.string().trim().min(2, "দোকানের নাম খুব ছোট।").max(80),
  slug: slugSchema,
  address: z.string().trim().max(200).default(""),
  phone: z.string().trim().max(20).default(""),
})

function firstError(error: z.ZodError) {
  return error.issues[0]?.message ?? "তথ্য সঠিক নয়।"
}

async function slugTaken(slug: string, exceptShopId?: unknown) {
  return Boolean(await Shop.exists({ slug, ...(exceptShopId ? { _id: { $ne: exceptShopId } } : {}) }))
}

/* -------------------------------- Shop setup ------------------------------- */

export async function createShop(input: z.input<typeof profileSchema>): Promise<ActionResult> {
  const user = await requireUser()
  const parsed = profileSchema.safeParse(input)
  if (!parsed.success) return fail(firstError(parsed.error))

  await connectDb()
  // The client navigates to the dashboard on success (a redirect here would surface as an error in useAction).
  if (await Shop.exists({ ownerId: user.id })) return { ok: true }
  if (await slugTaken(parsed.data.slug)) return fail("এই লিংকটি আগেই নেওয়া হয়েছে।")

  await Shop.create({
    ...parsed.data,
    ownerId: user.id,
    deviceLimit: env.trialDeviceLimit,
    paidUntil: new Date(Date.now() + env.trialDays * 24 * 60 * 60 * 1000),
  })
  return { ok: true }
}

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
const extraPaperSchema = z.object({ enabled: z.boolean(), bw: price, color: price })

// A4 prices plus the optional Legal and A3 sizes.
const pricingSchema = z.object({
  bw: price,
  color: price,
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

/* ------------------------------ PCs & devices ------------------------------ */

export async function createPairingCode(): Promise<ActionResult<{ code: string; agentId: string; expiresAt: string }>> {
  const { shop } = await requireShop()
  // Drop unused codes so only the latest one works.
  await Agent.deleteMany({ shopId: shop._id, tokenHash: { $exists: false } })

  const code = randomCode(8)
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000)
  const agent = await Agent.create({ shopId: shop._id, pairingCode: code, pairingExpiresAt: expiresAt })
  return { ok: true, code, agentId: agent.id, expiresAt: expiresAt.toISOString() }
}

export type PairingStatus = {
  /** waiting: code not used yet · paired: the PC connected · expired: code expired or replaced. */
  state: "waiting" | "paired" | "expired"
  machineName: string
  /** The PC has sent its printer list (first heartbeat after pairing). */
  checkedIn: boolean
  printers: number
}

/** Polled by the pairing dialog so it can show the PC connecting live. Read-only. */
export async function getPairingStatus(agentId: string): Promise<ActionResult<PairingStatus>> {
  const { shop } = await requireShop()
  if (!isValidObjectId(agentId)) return fail("কম্পিউটারটি সঠিক নয়।")

  const agent = await Agent.findOne({ _id: agentId, shopId: shop._id })
  if (!agent) return { ok: true, state: "expired", machineName: "", checkedIn: false, printers: 0 }
  if (!agent.tokenHash) {
    const expired = !agent.pairingExpiresAt || agent.pairingExpiresAt.getTime() < Date.now()
    return { ok: true, state: expired ? "expired" : "waiting", machineName: "", checkedIn: false, printers: 0 }
  }
  const printers = await Device.countDocuments({ agentId: agent._id })
  const checkedIn = printers > 0 || Boolean(agent.lastSeenAt && agent.pairedAt && agent.lastSeenAt > agent.pairedAt)
  return { ok: true, state: "paired", machineName: agent.machineName, checkedIn, printers }
}

export async function removeAgent(agentId: string): Promise<ActionResult> {
  const { shop } = await requireShop()
  if (!isValidObjectId(agentId)) return fail("কম্পিউটারটি সঠিক নয়।")

  const agent = await Agent.findOneAndDelete({ _id: agentId, shopId: shop._id })
  if (!agent) return fail("কম্পিউটারটি পাওয়া যায়নি।")
  await Device.deleteMany({ agentId: agent._id })
  // Jobs routed to this PC get re-routed to another one when it next checks in.
  await PrintJob.updateMany({ agentId: agent._id, status: "queued" }, { $unset: { deviceId: 1, agentId: 1 } })
  refresh()
  return { ok: true }
}

const deviceSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  color: z.boolean().optional(),
  enabled: z.boolean().optional(),
})

export async function updateDevice(deviceId: string, input: z.input<typeof deviceSchema>): Promise<ActionResult> {
  const { shop } = await requireShop()
  const parsed = deviceSchema.safeParse(input)
  if (!parsed.success || !isValidObjectId(deviceId)) return fail("তথ্য সঠিক নয়।")

  const device = await Device.findOne({ _id: deviceId, shopId: shop._id })
  if (!device) return fail("ডিভাইসটি পাওয়া যায়নি।")

  if (parsed.data.enabled && !device.enabled) {
    const enabledCount = await Device.countDocuments({ shopId: shop._id, enabled: true })
    if (enabledCount >= shop.deviceLimit) {
      return fail(`আপনার প্ল্যানে সর্বোচ্চ ${shop.deviceLimit.toLocaleString("bn-BD")}টি ডিভাইস চালু রাখা যায়। আরও যোগ করতে আমাদের সাথে যোগাযোগ করুন।`)
    }
  }

  device.set(parsed.data)
  await device.save()
  refresh()
  return { ok: true }
}

/* ----------------------------------- Jobs ---------------------------------- */

async function findShopJob(jobId: string) {
  const { shop } = await requireShop()
  if (!isValidObjectId(jobId)) return null
  return PrintJob.findOne({ _id: jobId, shopId: shop._id })
}

/** Cash orders: the owner collected the money, so start printing. */
export async function approveJob(jobId: string): Promise<ActionResult> {
  const job = await findShopJob(jobId)
  if (!job) return fail("অর্ডার পাওয়া যায়নি।")
  if (!(await queueJob(job._id, ["awaiting_approval"]))) return fail("এই অর্ডারটি এখন আর অনুমোদন করা যাবে না।")
  refresh()
  return { ok: true }
}

export async function cancelJob(jobId: string): Promise<ActionResult> {
  const job = await findShopJob(jobId)
  if (!job) return fail("অর্ডার পাওয়া যায়নি।")
  const updated = await PrintJob.findOneAndUpdate(
    { _id: job._id, status: { $in: ["awaiting_approval", "queued", "failed", "pending_payment"] } },
    { $set: { status: "cancelled" } },
    { returnDocument: "after" }
  )
  if (!updated) return fail("এই অর্ডারটি এখন আর বাতিল করা যাবে না।")
  await discardJobFile(updated)
  refresh()
  return { ok: true }
}

export async function reprintJob(jobId: string): Promise<ActionResult> {
  const job = await findShopJob(jobId)
  if (!job) return fail("অর্ডার পাওয়া যায়নি।")
  if (job.fileDeleted) return fail("ফাইলটি আগেই মুছে ফেলা হয়েছে।")
  const queued = await queueJob(job._id, ["failed"], { error: null, deviceId: null, agentId: null })
  if (!queued) return fail("শুধু ব্যর্থ অর্ডার আবার প্রিন্ট করা যায়।")
  refresh()
  return { ok: true }
}

/** The owner confirms the pages were printed (e.g. after fixing a jam manually). */
export async function markJobCompleted(jobId: string): Promise<ActionResult> {
  const job = await findShopJob(jobId)
  if (!job) return fail("অর্ডার পাওয়া যায়নি।")
  const updated = await PrintJob.findOneAndUpdate(
    { _id: job._id, status: { $in: ["printing", "failed"] } },
    { $set: { status: "completed", completedAt: new Date(), error: null } },
    { returnDocument: "after" }
  )
  if (!updated) return fail("এই অর্ডারটিকে সম্পন্ন হিসেবে চিহ্নিত করা যাবে না।")
  await discardJobFile(updated)
  refresh()
  return { ok: true }
}
