import type { Metadata } from "next"
import { JobsPage } from "@/features/jobs/jobs-page"

export const metadata: Metadata = { title: "প্রিন্ট অর্ডার" }

export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <JobsPage searchParams={searchParams} />
}
