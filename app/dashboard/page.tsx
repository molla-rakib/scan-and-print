import type { Metadata } from "next"
import { OverviewPage } from "@/features/overview/overview-page"

export const metadata: Metadata = { title: "সারসংক্ষেপ" }

export default function Page() {
  return <OverviewPage />
}
