import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { env } from "@/lib/env";
import { BeforeAfterSection } from "./components/before-after-section";
import { CtaSection } from "./components/cta-section";
import { FaqSection } from "./components/faq-section";
import { FeaturesSection } from "./components/features-section";
import { HeroSection } from "./components/hero-section";
import { HowItWorksSection } from "./components/how-it-works-section";
import { PricingSection } from "./components/pricing-section";
import { QueueTicker } from "./components/queue-ticker";
import { RequirementsSection } from "./components/requirements-section";
import { structuredData } from "./structured-data";

/** The home page (/): the public landing page for shop owners. */
export function LandingPage() {
  const fee = env.deviceMonthlyFee;
  const trialDays = env.trialDays;

  return (
    <div className="flex flex-1 flex-col bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: structuredData(fee, trialDays) }}
      />
      <SiteHeader />

      <main className="flex-1">
        <HeroSection trialDays={trialDays} />
        <QueueTicker />
        <BeforeAfterSection />
        <HowItWorksSection />
        <FeaturesSection />
        <RequirementsSection />
        <PricingSection fee={fee} trialDays={trialDays} />
        <FaqSection />
        <CtaSection />
      </main>

      <SiteFooter />
    </div>
  );
}
