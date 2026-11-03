import { NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, parseBody } from "@/lib/api"
import { randomToken } from "@/lib/crypto"
import { env } from "@/lib/env"
import { nextToken, shopIsOpen } from "@/lib/jobs"
import { PrintJob } from "@/lib/models"
import { countPdfPages, InvalidPdfError } from "@/lib/pdf"
import { findShopBySlug } from "@/lib/public-shop"
import { deleteFile, readFile, statFile } from "@/lib/storage"

const schema = z.object({
  slug: z.string().trim().min(1).max(60),
  key: z.string().trim().min(1).max(200),
  fileName: z.string().trim().min(1).max(200),
})

const DRAFT_LIFETIME_MS = 2 * 60 * 60 * 1000

/** Called after the browser finished uploading: validates the PDF, counts pages and creates a draft job. */
export async function POST(request: Request) {
  const body = await parseBody(request, schema)
  if (!body) return jsonError("অনুরোধটি সঠিক নয়")

  const shop = await findShopBySlug(body.slug)
  if (!shop || !shopIsOpen(shop)) return jsonError("এই দোকান এখন অর্ডার নিচ্ছে না", 404)
  if (!body.key.startsWith(`uploads/${shop.id}/`)) return jsonError("আপলোডটি সঠিক নয়")
  if (await PrintJob.exists({ fileKey: body.key })) return jsonError("এই আপলোডটি আগেই ব্যবহার করা হয়েছে")

  const stat = await statFile(body.key)
  if (!stat) return jsonError("আপলোড পাওয়া যায়নি। ফাইলটি আবার আপলোড করুন।", 404)
  if (stat.size > env.maxUploadBytes) {
    await deleteFile(body.key)
    return jsonError("ফাইলটি অনেক বড়")
  }

  let pageCount: number
  try {
    pageCount = await countPdfPages(await readFile(body.key))
  } catch (error) {
    await deleteFile(body.key)
    if (error instanceof InvalidPdfError) return jsonError(error.message, 422)
    throw error
  }

  const job = await PrintJob.create({
    publicId: randomToken(12),
    shopId: shop._id,
    token: await nextToken(shop._id),
    fileKey: body.key,
    fileName: body.fileName,
    fileSize: stat.size,
    pageCount,
    status: "draft",
    draftExpiresAt: new Date(Date.now() + DRAFT_LIFETIME_MS),
  })

  return NextResponse.json({ publicId: job.publicId, pageCount })
}
