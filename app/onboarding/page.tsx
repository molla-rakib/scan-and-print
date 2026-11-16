import type { Metadata } from "next"
import { OnboardingPage } from "@/features/onboarding/onboarding-page"

export const metadata: Metadata = { title: "দোকান সেটআপ", robots: { index: false } }

export default function Page() {
  return <OnboardingPage />
}
