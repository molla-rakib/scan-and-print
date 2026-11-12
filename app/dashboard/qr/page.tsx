import type { Metadata } from "next"
import { QrPage } from "@/features/qr/qr-page"

export const metadata: Metadata = { title: "QR কোড ও লিংক" }

export default function Page() {
  return <QrPage />
}
