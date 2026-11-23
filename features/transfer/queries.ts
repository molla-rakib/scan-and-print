import "server-only"
import { connectDb } from "@/lib/db"
import { Shop, Transfer } from "@/lib/models"
import { closeExpiredTransfers, transferView } from "@/lib/transfers"

/** A counter session as the customer's phone first sees it, or null for a wrong link. */
export async function transferPageView(publicId: string) {
  await connectDb()
  await closeExpiredTransfers()
  const transfer = await Transfer.findOne({ publicId })
  if (!transfer) return null
  const shop = await Shop.findById(transfer.shopId).select("name")
  return { ...transferView(transfer), shopName: shop?.name ?? "" }
}

export type TransferPageView = NonNullable<Awaited<ReturnType<typeof transferPageView>>>
