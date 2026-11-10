import { NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, parseBody } from "@/lib/api"
import { BkashError, createPayment, shopBkashCredentials } from "@/lib/bkash"
import { MAX_COPIES, PAPER_SIZES, cleanPages, filePrice, normalizeBdPhone, unitPrice } from "@/lib/constants"
import { connectDb } from "@/lib/db"
import { env } from "@/lib/env"
import { cashFields, colorDuplexAllowed, paperPrices, paymentOptions, placeOrder, shopIsOpen } from "@/lib/jobs"
import { Device, Order, PrintJob, Shop } from "@/lib/models"

const fileSchema = z.object({
  id: z.string(),
  colorMode: z.enum(["bw", "color"]),
  copies: z.number().int().min(1).max(MAX_COPIES),
  // Selected pages (1-based); empty or missing means every page.
  pages: z.array(z.number().int().min(1)).max(5000).default([]),
  duplex: z.boolean().default(false),
  paperSize: z.enum(PAPER_SIZES).default("A4"),
})

const schema = z.object({
  // Print options per file. May be left out when retrying the payment of an order that was already priced.
  files: z.array(fileSchema).max(100).optional(),
  method: z.enum(["bkash", "cash"]),
  customer: z
    .object({
      name: z.string().trim().max(80),
      phone: z.string().trim().max(20),
    })
    .optional(),
})

const round = (amount: number) => Math.round(amount * 100) / 100

/**
 * Confirms the print options of every file and starts payment.
 * bKash: returns the bKash payment page URL. Cash: prints right away; the customer's name and/or phone
 * (as the shop's cash settings ask) tell the shop who owes the money.
 */
export async function POST(request: Request, { params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params
  const body = await parseBody(request, schema)
  if (!body) return jsonError("অনুরোধটি সঠিক নয়")

  await connectDb()
  const order = await Order.findOne({ publicId })
  const shop = order && (await Shop.findById(order.shopId))
  if (!order || !shop) return jsonError("অর্ডার পাওয়া যায়নি", 404)
  if (!["draft", "pending_payment"].includes(order.status)) return jsonError("এই অর্ডারটি আগেই জমা দেওয়া হয়েছে", 409)
  if (!shopIsOpen(shop)) return jsonError("এই দোকান এখন অর্ডার নিচ্ছে না", 403)
  if (!paymentOptions(shop)[body.method]) return jsonError("এই দোকানে এই পেমেন্ট পদ্ধতি চালু নেই")

  const jobs = await PrintJob.find({ orderId: order._id, status: { $in: ["draft", "pending_payment"] } }).sort({ createdAt: 1 })
  if (jobs.length === 0) return jsonError("অর্ডারে কোনো ফাইল নেই। আবার ফাইল আপলোড করুন।", 410)

  if (body.files) {
    if (body.files.length !== jobs.length || jobs.some((job) => !body.files!.some((f) => f.id === job.id))) {
      return jsonError("ফাইলের তালিকা মিলছে না। পেজটি রিফ্রেশ করে আবার চেষ্টা করুন।", 409)
    }
    const enabled = await Device.find({ shopId: shop._id, enabled: true }).select("color duplex")

    for (const job of jobs) {
      const options = body.files.find((f) => f.id === job.id)!
      if (options.colorMode === "color" && !enabled.some((d) => d.color)) return jsonError("এই দোকানে রঙিন প্রিন্ট পাওয়া যায় না")
      if (options.duplex && !enabled.some((d) => d.duplex)) return jsonError("এই দোকানে দুই পাশে প্রিন্ট পাওয়া যায় না")
      if (
        options.duplex &&
        options.colorMode === "color" &&
        (!colorDuplexAllowed(shop) || !enabled.some((d) => d.color && d.duplex))
      ) {
        return jsonError("এই দোকানে রঙিন প্রিন্ট শুধু এক পাশে হয়")
      }
      const paper = paperPrices(shop, options.paperSize)
      if (!paper) return jsonError("এই দোকানে এই কাগজের মাপ পাওয়া যায় না")

      let pages = cleanPages(options.pages, job.pageCount)
      if (options.pages.length > 0 && pages.length === 0) return jsonError(`"${job.fileName}" ফাইলের অন্তত একটি পৃষ্ঠা বাছুন`)
      if (pages.length === job.pageCount) pages = []
      const printPages = pages.length || job.pageCount
      // A single page has no back side.
      const duplex = options.duplex && printPages > 1

      job.set({
        colorMode: options.colorMode,
        copies: options.copies,
        pages,
        printPages,
        duplex,
        paperSize: options.paperSize,
        pricePerPage: unitPrice(paper, options.colorMode, duplex),
        amount: filePrice(paper, { ...options, duplex }, printPages),
      })
    }
  } else if (order.status !== "pending_payment") {
    return jsonError("অনুরোধটি সঠিক নয়")
  }

  const amount = round(jobs.reduce((sum, job) => sum + job.amount, 0))
  const statusPage = `${env.appUrl}/j/${order.publicId}`
  order.set({ amount, paymentMethod: body.method })
  for (const job of jobs) job.set({ paymentMethod: body.method })

  if (body.method === "cash") {
    const fields = cashFields(shop)
    const name = fields.name ? (body.customer?.name ?? "") : ""
    const phone = fields.phone ? normalizeBdPhone(body.customer?.phone ?? "") : ""
    if (fields.name && name.length < 2) return jsonError("ক্যাশে দিতে আপনার নাম লিখুন")
    if (fields.phone && !phone) return jsonError("সঠিক মোবাইল নম্বর লিখুন (যেমন ০১৭১২৩৪৫৬৭৮)")
    order.set({ customer: { name: name || undefined, phone: phone || undefined } })
    await Promise.all([order.save(), ...jobs.map((job) => job.save())])
    await placeOrder(order._id, ["draft", "pending_payment"])
    return NextResponse.json({ redirectUrl: statusPage })
  }

  const creds = shopBkashCredentials(shop)
  if (!creds) return jsonError("এই দোকানে বিকাশ সেটআপ করা হয়নি")
  try {
    const payment = await createPayment(creds, {
      amount,
      invoice: `SP-${order.publicId}`,
      payerReference: String(order.token),
      callbackURL: `${env.appUrl}/api/bkash/callback?order=${order.publicId}`,
    })
    order.set({ status: "pending_payment", "bkash.paymentId": payment.paymentId })
    for (const job of jobs) job.set({ status: "pending_payment" })
    await Promise.all([order.save(), ...jobs.map((job) => job.save())])
    return NextResponse.json({ redirectUrl: payment.bkashUrl })
  } catch (error) {
    if (error instanceof BkashError) return jsonError(error.message, 502)
    throw error
  }
}
