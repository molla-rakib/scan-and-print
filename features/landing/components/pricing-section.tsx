import Link from "next/link";
import { CheckIcon } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { formatNumber, formatTaka } from "@/lib/constants";
import { Eyebrow } from "./section-heading";

/** Pricing as a shop receipt. */
export function PricingSection({ fee, trialDays }: { fee: number; trialDays: number }) {
  return (
    <section id="pricing" className="bg-paper scroll-mt-16">
      <div className="mx-auto grid max-w-6xl gap-14 px-4 py-20 md:px-6 md:py-28 lg:grid-cols-2 lg:items-center">
        <div className="flex flex-col gap-4">
          <Eyebrow>মূল্য</Eyebrow>
          <h2 className="text-3xl leading-tight font-extrabold tracking-tight text-balance md:text-5xl">
            যত মেশিন, তত খরচ।
            <br />
            <span className="marker px-1">এর বেশি এক টাকাও না।</span>
          </h2>
          <p className="text-lg leading-relaxed text-muted-foreground">
            অর্ডারপ্রতি কমিশন নেই, সেটআপ ফি নেই। প্রথম{" "}
            {formatNumber(trialDays)} দিন একদম ফ্রি — কোনো কার্ড বা পেমেন্ট
            লাগবে না।
          </p>
        </div>
        <div className="mx-auto w-full max-w-sm rotate-1 drop-shadow-[0_18px_30px_oklch(0.18_0.02_264/0.15)]">
          <div className="edge-zigzag bg-background px-7 pt-8 font-mono">
            <div className="flex flex-col items-center gap-1 border-b border-dashed border-foreground/30 pb-5 text-center">
              <Logo className="h-12" />
              <span className="text-xs text-muted-foreground">
                মাসিক বিল · প্রতি মেশিন
              </span>
            </div>
            <div className="flex items-baseline justify-center gap-1 py-6">
              <span className="text-6xl font-bold tracking-tighter">
                {formatTaka(fee)}
              </span>
              <span className="text-muted-foreground">/মাস</span>
            </div>
            <ul className="flex flex-col gap-2.5 border-y border-dashed border-foreground/30 py-5 text-sm">
              {[
                "সীমাহীন প্রিন্ট অর্ডার",
                "নিজের বিকাশ মার্চেন্ট",
                "ক্যাশ মোড ও সাউন্ড অ্যালার্ট",
                "QR কোড পোস্টার",
                "অর্ডার ও আয়ের হিসাব",
              ].map((item) => (
                <li key={item} className="flex items-baseline gap-2">
                  <span>{item}</span>
                  <span className="flex-1 border-b border-dotted border-foreground/30" />
                  <CheckIcon className="size-4 shrink-0 self-center text-emerald-600" />
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-1 py-5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>উদাহরণ: ১ প্রিন্টার + ১ ফটোকপি</span>
              </div>
              <div className="flex justify-between text-base font-bold">
                <span>মোট</span>
                <span>{formatTaka(fee * 2)}/মাস</span>
              </div>
            </div>
            <Button
              size="lg"
              className="h-12 w-full font-sans text-base"
              render={<Link href="/login" />}
              nativeButton={false}
            >
              ফ্রি ট্রায়াল শুরু করুন
            </Button>
            <p className="pt-4 text-center text-xs text-muted-foreground">
              ধন্যবাদ, আবার আসবেন ✦
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
