import type { Metadata } from "next"
import { ShopsPage } from "@/features/admin/shops/shops-page"

export const metadata: Metadata = { title: "অ্যাডমিন" }

export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <ShopsPage searchParams={searchParams} />
}
