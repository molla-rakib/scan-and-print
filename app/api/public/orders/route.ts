import { NextResponse } from "next/server"
import { z } from "zod"
import { jsonError } from "@/lib/api"
import { MAX_FILES_PER_ORDER, formatNumber } from "@/lib/constants"
import { randomToken } from "@/lib/crypto"
import { env } from "@/lib/env"
import { nextToken, shopIsOpen } from "@/lib/jobs"
import { Order, PrintJob } from "@/lib/models"
import { InvalidPdfError, preparePrintFile } from "@/lib/pdf"
import { findShopBySlug } from "@/lib/public-shop"
import { deleteFile, saveFile } from "@/lib/storage"

const schema = z.object({
  slug: z.string().trim().min(1).max(60),
  file: z.instanceof(File),
  // Adds the file to this draft order; a new order is created when it's missing.
  order: z.string().trim().max(40).optional(),
})

const DRAFT_LIFETIME_MS = 2 * 60 * 60 * 1000

/**
 * Receives one file (multipart): a PDF, or a JPG/PNG photo that is turned into a one-page PDF.
 * Validates it, counts pages, stores it and adds it as a draft job to the customer's draft order.
 */
export async function POST(request: Request) {
  const maxBytes = env.maxUploadBytes
  const tooBig = () => jsonError(`ফাইলটি অনেক বড়। সর্বোচ্চ ${formatNumber(Math.round(maxBytes / 1024 / 1024))} MB।`, 413)
  if (Number(request.headers.get("content-length")) > maxBytes + 64 * 1024) return tooBig()

  const form = await request.formData().catch(() => null)
  const body = schema.safeParse({
    slug: form?.get("slug"),
    file: form?.get("file"),
    order: form?.get("order") || undefined,
  })
  if (!body.success) return jsonError("অনুরোধটি সঠিক নয়")
  const { slug, file } = body.data

  const shop = await findShopBySlug(slug)
  if (!shop || !shopIsOpen(shop)) return jsonError("এই দোকান এখন অর্ডার নিচ্ছে না", 404)
  if (file.size === 0 || file.size > maxBytes) return tooBig()

  const expiresAt = new Date(Date.now() + DRAFT_LIFETIME_MS)
  let order = body.data.order ? await Order.findOne({ publicId: body.data.order, shopId: shop._id, status: "draft" }) : null
  if (body.data.order && !order) return jsonError("অর্ডারটির মেয়াদ শেষ হয়ে গেছে। পেজটি রিফ্রেশ করে আবার চেষ্টা করুন।", 410)
  if (order && (await PrintJob.countDocuments({ orderId: order._id })) >= MAX_FILES_PER_ORDER) {
    return jsonError(`একটি অর্ডারে সর্বোচ্চ ${formatNumber(MAX_FILES_PER_ORDER)}টি ফাইল দেওয়া যাবে।`)
  }

  let prepared: Awaited<ReturnType<typeof preparePrintFile>>
  try {
    prepared = await preparePrintFile(Buffer.from(await file.arrayBuffer()), file.name)
  } catch (error) {
    if (error instanceof InvalidPdfError) return jsonError(error.message, 422)
    throw error
  }

  const fileName = file.name.trim().slice(0, 200) || (prepared.kind === "pdf" ? "document.pdf" : `photo.${prepared.kind}`)
  const fileKey = await saveFile(prepared.pdf, fileName, shop.id)
  try {
    if (order) {
      order.draftExpiresAt = expiresAt
      await order.save()
    } else {
      order = await Order.create({
        publicId: randomToken(12),
        shopId: shop._id,
        token: await nextToken(shop._id),
        status: "draft",
        draftExpiresAt: expiresAt,
      })
    }
    const job = await PrintJob.create({
      orderId: order._id,
      shopId: shop._id,
      token: order.token,
      fileKey,
      fileName,
      fileSize: prepared.pdf.length,
      pageCount: prepared.pageCount,
      printPages: prepared.pageCount,
      status: "draft",
      draftExpiresAt: expiresAt,
    })
    // Keep every file of the order alive as long as the newest one.
    await PrintJob.updateMany({ orderId: order._id, status: "draft" }, { $set: { draftExpiresAt: expiresAt } })
    return NextResponse.json({ order: order.publicId, file: { id: job.id, pageCount: prepared.pageCount } })
  } catch (error) {
    await deleteFile(fileKey).catch(() => {})
    throw error
  }
}
