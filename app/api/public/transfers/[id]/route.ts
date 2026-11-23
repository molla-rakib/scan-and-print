import { NextResponse } from "next/server"
import { connectDb } from "@/lib/db"
import { Shop, Transfer } from "@/lib/models"
import { closeExpiredTransfers, transferView } from "@/lib/transfers"

/** The customer's phone polls this: the session's state and files, and the shop's name. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await connectDb()
  await closeExpiredTransfers()
  const transfer = await Transfer.findOne({ publicId: (await params).id })
  if (!transfer) return NextResponse.json({ error: "লিংকটি সঠিক নয়" }, { status: 404 })
  const shop = await Shop.findById(transfer.shopId).select("name")
  return NextResponse.json({ ...transferView(transfer), shopName: shop?.name ?? "" }, { headers: { "Cache-Control": "no-store" } })
}
