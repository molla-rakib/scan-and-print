"use server"

import { randomUUID } from "node:crypto"
import { headers } from "next/headers"
import { refresh } from "next/cache"
import { z } from "zod"
import { fail, type ActionResult } from "@/lib/action-result"
import { requireShop } from "@/lib/auth"
import {
  availableBillingMethods,
  canChangeDevices,
  getBillingSettings,
  markUnpaid,
  monthlyFee,
  monthsToDays,
  platformBkashCredentials,
  platformEpsCredentials,
} from "@/lib/billing"
import { BkashError, createPayment } from "@/lib/bkash"
import { BILLING_MONTHS, MAX_BILLING_DEVICES, billingAmount, normalizeBdPhone } from "@/lib/constants"
import { env } from "@/lib/env"
import { EpsError, initializeEpsPayment } from "@/lib/eps"
import { SubscriptionPayment, type ShopDoc } from "@/lib/models"

const monthsSchema = z.number().refine((m) => (BILLING_MONTHS as readonly number[]).includes(m))
const devicesSchema = z.number().int().min(1).max(MAX_BILLING_DEVICES)

/**
 * What a payment buys and costs. The owner's device count only counts in the renewal window; outside it the
 * payment carries no device count, so approving it later never undoes a limit the admin changed meanwhile.
 */
function quote(shop: ShopDoc, months: number, devices: number) {
  const chosen = canChangeDevices(shop) ? devices : undefined
  return {
    ...(chosen ? { devices: chosen } : {}),
    amount: billingAmount(monthlyFee(shop, chosen ?? shop.deviceLimit), months),
    days: monthsToDays(months),
  }
}

/** The price changed since the page was loaded (e.g. a discount ended): the owner must see the new one first. */
const PRICE_CHANGED = "দাম বদলে গেছে। পেজটি রিফ্রেশ করে নতুন দাম দেখে আবার চেষ্টা করুন।"

const manualSchema = z.object({
  method: z.enum(["manual_bkash", "manual_nagad"]),
  months: monthsSchema,
  devices: devicesSchema,
  expectedAmount: z.number(),
  trxId: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{6,20}$/),
  senderNumber: z.string().trim(),
})

/** The owner sent money to our bKash/Nagad number and reports it; the admin approves or rejects it. */
export async function submitManualPayment(input: z.input<typeof manualSchema>): Promise<ActionResult> {
  const { user, shop } = await requireShop()
  const parsed = manualSchema.safeParse(input)
  if (!parsed.success) return fail("তথ্য সঠিক নয়। TrxID ঠিকমতো লিখুন।")
  const data = parsed.data
  const sender = normalizeBdPhone(data.senderNumber)
  if (!sender) return fail("যে নম্বর থেকে টাকা পাঠিয়েছেন সেটি সঠিকভাবে লিখুন।")
  const priced = quote(shop, data.months, data.devices)
  if (priced.amount !== data.expectedAmount) return fail(PRICE_CHANGED)

  const settings = await getBillingSettings()
  if (!availableBillingMethods(settings).includes(data.method)) return fail("এই পদ্ধতি এখন চালু নেই।")
  if (await SubscriptionPayment.exists({ shopId: shop._id, status: "pending", method: { $in: ["manual_bkash", "manual_nagad"] } })) {
    return fail("আপনার আগের পেমেন্ট এখনো যাচাই হচ্ছে। যাচাই শেষ হলে আবার দিন।")
  }
  if (await SubscriptionPayment.exists({ trxId: data.trxId, status: { $in: ["pending", "paid"] } })) {
    return fail("এই TrxID আগেই ব্যবহার হয়েছে।")
  }

  await SubscriptionPayment.create({
    shopId: shop._id,
    method: data.method,
    status: "pending",
    ...priced,
    trxId: data.trxId,
    senderNumber: sender,
    submittedBy: user.email,
  })
  refresh()
  return { ok: true }
}

const gatewaySchema = z.object({
  method: z.enum(["bkash", "eps"]),
  months: monthsSchema,
  devices: devicesSchema,
  expectedAmount: z.number(),
})

/** Starts a bKash or EPS payment; the browser then goes to the returned gateway page. */
export async function startGatewayPayment(input: z.input<typeof gatewaySchema>): Promise<ActionResult<{ url: string }>> {
  const { user, shop } = await requireShop()
  const parsed = gatewaySchema.safeParse(input)
  if (!parsed.success) return fail("তথ্য সঠিক নয়।")
  const { method, months, devices, expectedAmount } = parsed.data

  const settings = await getBillingSettings()
  if (!availableBillingMethods(settings).includes(method)) return fail("এই পদ্ধতি এখন চালু নেই।")

  const { amount, ...rest } = quote(shop, months, devices)
  if (amount !== expectedAmount) return fail(PRICE_CHANGED)
  const payment = await SubscriptionPayment.create({
    shopId: shop._id,
    method,
    status: "pending",
    amount,
    ...rest,
    submittedBy: user.email,
  })
  const invoice = `SUB-${payment.id}`

  try {
    if (method === "bkash") {
      const creds = platformBkashCredentials(settings)!
      const { paymentId, bkashUrl } = await createPayment(creds, {
        amount,
        invoice,
        payerReference: shop.phone || shop.slug,
        callbackURL: `${env.appUrl}/api/billing/bkash/callback?payment=${payment.id}`,
      })
      await SubscriptionPayment.updateOne({ _id: payment._id }, { $set: { gatewayRef: paymentId } })
      return { ok: true, url: bkashUrl }
    }

    const creds = platformEpsCredentials(settings)!
    // EPS wants a fresh, unique ID per attempt; it reports the result by this ID.
    const merchantTransactionId = randomUUID().replace(/-/g, "").slice(0, 20)
    await SubscriptionPayment.updateOne({ _id: payment._id }, { $set: { gatewayRef: merchantTransactionId } })
    const back = (result: string) => `${env.appUrl}/api/billing/eps/${result}?payment=${payment.id}`
    const requestHeaders = await headers()
    const { redirectUrl } = await initializeEpsPayment(creds, {
      merchantTransactionId,
      orderId: invoice,
      amount,
      successUrl: back("success"),
      failUrl: back("fail"),
      cancelUrl: back("cancel"),
      customerName: user.name || shop.name,
      customerEmail: user.email,
      customerPhone: normalizeBdPhone(shop.phone) ?? "01700000000",
      customerAddress: shop.address || "Bangladesh",
      productName: `Mudron subscription (${months} month)`,
      ipAddress: requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1",
    })
    return { ok: true, url: redirectUrl }
  } catch (error) {
    const message = error instanceof BkashError || error instanceof EpsError ? error.message : "পেমেন্ট শুরু করা যায়নি।"
    await markUnpaid(payment._id, "failed", message)
    console.error("Subscription payment start failed", error)
    return fail(message)
  }
}
