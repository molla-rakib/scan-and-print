import type { Metadata } from "next"
import { LoginPage } from "@/features/login/login-page"

export const metadata: Metadata = { title: "লগইন", robots: { index: false } }

export default function Page({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return <LoginPage searchParams={searchParams} />
}
