import "server-only"
import { formatPageSelection, printerDuplexes, printerHasPaper, type ColorMode, type JobStatus, type PaperSize } from "@/lib/constants"
import { connectDb } from "@/lib/db"
import { availableDevices, cashFields, colorDuplexAllowed, orderStatus, paperOptions, paymentOptions, queuePosition, shopIsOpen } from "@/lib/jobs"
import { Device, PrintJob, Shop, type OrderDoc, type ShopDoc } from "@/lib/models"

export async function findShopBySlug(slug: string) {
  await connectDb()
  return Shop.findOne({ slug: slug.toLowerCase() })
}

/** Everything the customer page needs to know about a shop. Never exposes credentials. */
export async function publicShopView(shop: ShopDoc) {
  const [enabled, online] = await Promise.all([
    Device.find({ shopId: shop._id, enabled: true }).select("color duplex paperSizes duplexSizes"),
    availableDevices(shop._id),
  ])
  const papers = paperOptions(shop)
  return {
    name: shop.name,
    slug: shop.slug,
    address: shop.address,
    open: shopIsOpen(shop),
    papers,
    payments: paymentOptions(shop),
    cashFields: cashFields(shop),
    hasColor: enabled.some((d) => d.color),
    // Paper sizes that one printer can print on both sides; color also needs the owner's switch.
    duplexSizes: {
      bw: papers.map((p) => p.size).filter((size) => enabled.some((d) => printerHasPaper(d, size) && printerDuplexes(d, size))),
      color: colorDuplexAllowed(shop)
        ? papers
            .map((p) => p.size)
            .filter((size) => enabled.some((d) => d.color && printerHasPaper(d, size) && printerDuplexes(d, size)))
        : [],
    } satisfies Record<ColorMode, PaperSize[]>,
    online: online.length > 0,
  }
}

export type PublicShopView = Awaited<ReturnType<typeof publicShopView>>

export async function publicOrderView(order: OrderDoc, shop: ShopDoc) {
  const jobs = await PrintJob.find({ orderId: order._id }).sort({ createdAt: 1 })
  const devices = await Device.find({ _id: { $in: jobs.map((j) => j.deviceId).filter(Boolean) } }).select("name")
  const deviceName = (id: unknown) => devices.find((d) => d._id.equals(id as string))?.name ?? null

  const files = await Promise.all(
    jobs.map(async (job) => ({
      id: job.id as string,
      fileName: job.fileName,
      pageCount: job.pageCount,
      printPages: job.printPages || job.pageCount,
      pagesLabel: formatPageSelection(job.pages, job.pageCount),
      colorMode: job.colorMode as ColorMode,
      duplex: job.duplex,
      paperSize: job.paperSize as PaperSize,
      copies: job.copies,
      amount: job.amount,
      status: job.status as JobStatus,
      error: job.error ?? null,
      queuePosition: await queuePosition(job),
      deviceName: job.deviceId ? deviceName(job.deviceId) : null,
    }))
  )
  const positions = files.map((f) => f.queuePosition).filter((p): p is number => p !== null)

  return {
    publicId: order.publicId,
    token: order.token,
    status: orderStatus(order, jobs),
    amount: order.amount,
    paymentMethod: order.paymentMethod ?? null,
    trxId: order.bkash?.trxId ?? null,
    queuePosition: positions.length ? Math.min(...positions) : null,
    files,
    shop: { name: shop.name, slug: shop.slug, payments: paymentOptions(shop), cashFields: cashFields(shop) },
    updatedAt: order.updatedAt.toISOString(),
  }
}

export type PublicOrderView = Awaited<ReturnType<typeof publicOrderView>>
