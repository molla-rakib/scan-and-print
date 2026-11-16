import type { Metadata } from "next"
import { OrderStatusPage } from "@/features/order-status/order-status-page"

export const metadata: Metadata = { title: "অর্ডারের অবস্থা", robots: { index: false } }

type Props = { params: Promise<{ publicId: string }>; searchParams: Promise<{ payment?: string }> }

export default function JobPage(props: Props) {
  return <OrderStatusPage {...props} />
}
