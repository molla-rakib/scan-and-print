import type { Metadata } from "next"
import { BillingPage } from "@/features/billing/billing-page"

export const metadata: Metadata = { title: "বিল ও পেমেন্ট" }

export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <BillingPage searchParams={searchParams} />
}
