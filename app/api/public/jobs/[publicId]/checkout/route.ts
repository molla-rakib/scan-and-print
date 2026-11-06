import { NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, parseBody } from "@/lib/api"
import { BkashError, createPayment, shopBkashCredentials } from "@/lib/bkash"
import { MAX_COPIES, normalizeBdPhone } from "@/lib/constants"
import { connectDb } from "@/lib/db"
import { env } from "@/lib/env"
import { paymentOptions, queueJob, shopIsOpen } from "@/lib/jobs"
import { Device, PrintJob, Shop } from "@/lib/models"

const schema = z.object({
  colorMode: z.enum(["bw", "color"]),
  copies: z.number().int().min(1).max(MAX_COPIES),
  method: z.enum(["bkash", "cash"]),
  customer: z
    .object({
      name: z.string().trim().max(80),
      phone: z.string().trim().max(20),
    })
    .optional(),
})

/**
 * Confirms print options and starts payment.
 * bKash: returns the bKash payment page URL. Cash: prints right away; the customer's name and phone
 * (required) tell the shop who owes the money.
 */
export async function POST(request: Request, { params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params
  const body = await parseBody(request, schema)
  if (!body) return jsonError("অনুরোধটি সঠিক নয়")

  await connectDb()
  const job = await PrintJob.findOne({ publicId })
  const shop = job && (await Shop.findById(job.shopId))
  if (!job || !shop) return jsonError("অর্ডার পাওয়া যায়নি", 404)
  if (!["draft", "pending_payment"].includes(job.status)) return jsonError("এই অর্ডারটি আগেই জমা দেওয়া হয়েছে", 409)
  if (!shopIsOpen(shop)) return jsonError("এই দোকান এখন অর্ডার নিচ্ছে না", 403)

  const options = paymentOptions(shop)
  if (!options[body.method]) return jsonError("এই দোকানে এই পেমেন্ট পদ্ধতি চালু নেই")
  if (body.colorMode === "color" && !(await Device.exists({ shopId: shop._id, enabled: true, color: true }))) {
    return jsonError("এই দোকানে রঙিন প্রিন্ট পাওয়া যায় না")
  }

  const pricePerPage = body.colorMode === "color" ? shop.pricing.color : shop.pricing.bw
  const amount = Math.round(pricePerPage * job.pageCount * body.copies * 100) / 100
  const statusPage = `${env.appUrl}/j/${job.publicId}`

  job.set({ colorMode: body.colorMode, copies: body.copies, pricePerPage, amount, paymentMethod: body.method })

  if (body.method === "cash") {
    const name = body.customer?.name ?? ""
    const phone = normalizeBdPhone(body.customer?.phone ?? "")
    if (name.length < 2) return jsonError("ক্যাশে দিতে আপনার নাম লিখুন")
    if (!phone) return jsonError("সঠিক মোবাইল নম্বর লিখুন (যেমন ০১৭১২৩৪৫৬৭৮)")
    job.set({ customer: { name, phone } })
    await job.save()
    await queueJob(job._id, ["draft", "pending_payment"])
    return NextResponse.json({ redirectUrl: statusPage })
  }

  const creds = shopBkashCredentials(shop)
  if (!creds) return jsonError("এই দোকানে বিকাশ সেটআপ করা হয়নি")
  try {
    const payment = await createPayment(creds, {
      amount,
      invoice: `SP-${job.publicId}`,
      payerReference: String(job.token),
      callbackURL: `${env.appUrl}/api/bkash/callback?job=${job.publicId}`,
    })
    job.set({ status: "pending_payment", "bkash.paymentId": payment.paymentId })
    await job.save()
    return NextResponse.json({ redirectUrl: payment.bkashUrl })
  } catch (error) {
    if (error instanceof BkashError) return jsonError(error.message, 502)
    throw error
  }
}
