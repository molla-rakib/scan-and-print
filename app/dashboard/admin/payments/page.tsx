import type { Metadata } from "next"
import { PaymentsPage } from "@/features/admin/payments/payments-page"

export const metadata: Metadata = { title: "পেমেন্ট · অ্যাডমিন" }

export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <PaymentsPage searchParams={searchParams} />
}
