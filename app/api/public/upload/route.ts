import { NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, parseBody } from "@/lib/api"
import { env } from "@/lib/env"
import { shopIsOpen } from "@/lib/jobs"
import { findShopBySlug } from "@/lib/public-shop"
import { presignUpload, uploadKey } from "@/lib/storage"

const schema = z.object({
  slug: z.string().trim().min(1).max(60),
  size: z.number().int().positive(),
})

/** Returns a signed form that lets the browser upload one PDF straight to storage. */
export async function POST(request: Request) {
  const body = await parseBody(request, schema)
  if (!body) return jsonError("অনুরোধটি সঠিক নয়")

  const shop = await findShopBySlug(body.slug)
  if (!shop || !shopIsOpen(shop)) return jsonError("এই দোকান এখন অর্ডার নিচ্ছে না", 404)

  const maxBytes = env.maxUploadBytes
  if (body.size > maxBytes) return jsonError(`ফাইলটি অনেক বড়। সর্বোচ্চ ${Math.round(maxBytes / 1024 / 1024)} MB।`)

  const key = uploadKey(shop.id)
  const { postURL, formData } = await presignUpload(key, maxBytes)
  return NextResponse.json({ key, url: postURL, fields: formData })
}
