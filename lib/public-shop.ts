import "server-only"
import { connectDb } from "@/lib/db"
import { availableDevices, paymentOptions, queuePosition, shopIsOpen } from "@/lib/jobs"
import { Device, Shop, type PrintJobDoc, type ShopDoc } from "@/lib/models"

export async function findShopBySlug(slug: string) {
  await connectDb()
  return Shop.findOne({ slug: slug.toLowerCase() })
}

/** Everything the customer page needs to know about a shop. Never exposes credentials. */
export async function publicShopView(shop: ShopDoc) {
  const [enabled, online] = await Promise.all([
    Device.find({ shopId: shop._id, enabled: true }).select("color"),
    availableDevices(shop._id),
  ])
  return {
    name: shop.name,
    slug: shop.slug,
    address: shop.address,
    open: shopIsOpen(shop),
    pricing: { bw: shop.pricing?.bw ?? 0, color: shop.pricing?.color ?? 0 },
    payments: paymentOptions(shop),
    hasColor: enabled.some((d) => d.color),
    online: online.length > 0,
  }
}

export type PublicShopView = Awaited<ReturnType<typeof publicShopView>>

export async function publicJobView(job: PrintJobDoc, shop: ShopDoc) {
  const device = job.deviceId ? await Device.findById(job.deviceId).select("name") : null
  return {
    publicId: job.publicId,
    token: job.token,
    status: job.status,
    fileName: job.fileName,
    pageCount: job.pageCount,
    colorMode: job.colorMode,
    copies: job.copies,
    amount: job.amount,
    paymentMethod: job.paymentMethod ?? null,
    trxId: job.bkash?.trxId ?? null,
    error: job.error ?? null,
    queuePosition: await queuePosition(job),
    deviceName: device?.name ?? null,
    shop: { name: shop.name, slug: shop.slug, payments: paymentOptions(shop) },
    updatedAt: job.updatedAt.toISOString(),
  }
}

export type PublicJobView = Awaited<ReturnType<typeof publicJobView>>
