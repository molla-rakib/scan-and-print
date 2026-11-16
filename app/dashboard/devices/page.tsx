import type { Metadata } from "next"
import { DevicesPage } from "@/features/devices/devices-page"

export const metadata: Metadata = { title: "ডিভাইস" }

export default function Page() {
  return <DevicesPage />
}
