import type { Metadata } from "next"
import { TransferPage } from "@/features/transfer/transfer-page"

export const metadata: Metadata = { title: "দোকানের সাথে ফাইল আদান-প্রদান", robots: { index: false } }

type Props = { params: Promise<{ id: string }> }

export default function Page(props: Props) {
  return <TransferPage {...props} />
}
