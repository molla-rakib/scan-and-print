import { NextResponse } from "next/server"
import { z } from "zod"
import { jsonError } from "@/lib/api"
import { MAX_FILES_PER_ORDER, UPLOAD_CHUNK_BYTES, UPLOAD_ID_PATTERN, formatNumber } from "@/lib/constants"
import { randomToken } from "@/lib/crypto"
import { env } from "@/lib/env"
import { nextToken, shopIsOpen } from "@/lib/jobs"
import { Order, PrintJob, UploadPart } from "@/lib/models"
import { InvalidPdfError, preparePrintFile } from "@/lib/pdf"
import { findShopBySlug } from "@/lib/public-shop"
import { deleteFile, saveFile } from "@/lib/storage"

const schema = z
  .object({
    slug: z.string().trim().min(1).max(60),
    // Small files come in this request…
    file: z.instanceof(File).optional(),
    // …large ones were sent in pieces to /api/public/uploads first (Vercel's 4.5 MB body limit).
    upload: z.string().regex(UPLOAD_ID_PATTERN).optional(),
    parts: z.coerce.number().int().min(1).max(1000).optional(),
    name: z.string().max(300).optional(),
    // Adds the file to this draft order; a new order is created when it's missing.
    order: z.string().trim().max(40).optional(),
  })
  .refine((body) => body.file || (body.upload && body.parts), "file or upload is required")

const DRAFT_LIFETIME_MS = 2 * 60 * 60 * 1000

// Joining pieces and turning a photo into a PDF can take a few seconds on Vercel's small CPUs.
export const maxDuration = 60

/**
 * Receives one file (multipart), or joins a file uploaded in pieces: a PDF, or a JPG/PNG photo that is
 * turned into a one-page PDF.
 * Validates it, counts pages, stores it and adds it as a draft job to the customer's draft order.
 */
export async function POST(request: Request) {
  const maxBytes = env.maxUploadBytes
  const tooBig = () => jsonError(`ফাইলটি অনেক বড়। সর্বোচ্চ ${formatNumber(Math.round(maxBytes / 1024 / 1024))} MB।`, 413)
  if (Number(request.headers.get("content-length")) > maxBytes + 64 * 1024) return tooBig()

  const form = await request.formData().catch(() => null)
  const body = schema.safeParse({
    slug: form?.get("slug"),
    file: form?.get("file") || undefined,
    upload: form?.get("upload") || undefined,
    parts: form?.get("parts") || undefined,
    name: form?.get("name") || undefined,
    order: form?.get("order") || undefined,
  })
  if (!body.success) return jsonError("অনুরোধটি সঠিক নয়")
  const { slug, file } = body.data

  const shop = await findShopBySlug(slug)
  if (!shop || !shopIsOpen(shop)) return jsonError("এই দোকান এখন অর্ডার নিচ্ছে না", 404)

  let bytes: Buffer
  let originalName: string
  if (file) {
    if (file.size === 0 || file.size > maxBytes) return tooBig()
    bytes = Buffer.from(await file.arrayBuffer())
    originalName = file.name
  } else {
    const uploadId = body.data.upload!
    const pieces = await UploadPart.find({ uploadId, shopId: shop._id }).sort({ index: 1 })
    if (pieces.length !== body.data.parts || pieces.some((piece, i) => piece.index !== i)) {
      return jsonError("ফাইলের সব অংশ পৌঁছায়নি। আবার আপলোড করুন।")
    }
    bytes = Buffer.concat(pieces.map((piece) => Buffer.from(piece.data)))
    await UploadPart.deleteMany({ uploadId, shopId: shop._id })
    if (bytes.length > maxBytes) return tooBig()
    // Every piece but the last is full-size; anything else means pieces got mixed up.
    if (pieces.slice(0, -1).some((piece) => piece.data.length !== UPLOAD_CHUNK_BYTES)) {
      return jsonError("ফাইলের অংশগুলো মিলছে না। আবার আপলোড করুন।")
    }
    originalName = body.data.name ?? ""
  }

  const expiresAt = new Date(Date.now() + DRAFT_LIFETIME_MS)
  let order = body.data.order ? await Order.findOne({ publicId: body.data.order, shopId: shop._id, status: "draft" }) : null
  if (body.data.order && !order) return jsonError("অর্ডারটির মেয়াদ শেষ হয়ে গেছে। পেজটি রিফ্রেশ করে আবার চেষ্টা করুন।", 410)
  if (order && (await PrintJob.countDocuments({ orderId: order._id })) >= MAX_FILES_PER_ORDER) {
    return jsonError(`একটি অর্ডারে সর্বোচ্চ ${formatNumber(MAX_FILES_PER_ORDER)}টি ফাইল দেওয়া যাবে।`)
  }

  let prepared: Awaited<ReturnType<typeof preparePrintFile>>
  try {
    prepared = await preparePrintFile(bytes, originalName)
  } catch (error) {
    if (error instanceof InvalidPdfError) return jsonError(error.message, 422)
    throw error
  }

  const fileName = originalName.trim().slice(0, 200) || (prepared.kind === "pdf" ? "document.pdf" : `photo.${prepared.kind}`)
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
