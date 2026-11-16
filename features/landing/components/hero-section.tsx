import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { inks } from "../content";
import { PrinterScene } from "./printer-scene";

/** Hero: the headline, the trial button and the printer illustration. */
export function HeroSection({ trialDays }: { trialDays: number }) {
  return (
    <section className="bg-paper relative overflow-hidden border-b border-foreground/10">
      <RegistrationMark className="absolute top-6 left-6 hidden md:block" />
      <RegistrationMark className="absolute top-6 right-6 hidden md:block" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-16 px-4 pt-14 pb-20 md:px-6 md:pt-20 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="flex flex-col items-start gap-7">
          <span className="inline-flex items-center gap-3 rounded-full border border-foreground/15 bg-background px-3 py-1 text-sm">
            <span className="flex gap-1">
              {inks.map((ink) => (
                <span
                  key={ink}
                  className={cn("size-2.5 rounded-full", ink)}
                />
              ))}
            </span>
            প্রিন্ট ও ফটোকপি দোকানের জন্য
          </span>
          <h1 className="text-[2.6rem] leading-[1.15] font-extrabold tracking-tight text-balance sm:text-6xl lg:text-7xl lg:leading-[1.08]">
            {/* The old ways take turns in one slot, each struck through, so the line stays short. */}
            <span className="sr-only">পেনড্রাইভ, WhatsApp বা ইমেইল নয়,</span>
            <span aria-hidden className="word-cycle">
              {["পেনড্রাইভ", "WhatsApp", "ইমেইল"].map((word) => (
                <span key={word}>
                  <s>{word}</s> নয়,
                </span>
              ))}
            </span>
            <br />
            <span className="marker px-1">QR কোড</span> দিয়েই প্রিন্ট।
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-pretty text-foreground/70">
            গ্রাহক QR স্ক্যান করে PDF পাঠায়, বিকাশে টাকা দেয় — আর আপনার
            দোকানের প্রিন্টার নিজে থেকেই ছাপা শুরু করে। আপনি শুধু কাগজটা
            হাতে তুলে দেন।
          </p>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button
              size="lg"
              className="h-13 px-7 text-base shadow-[4px_4px_0_0_var(--foreground)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_var(--foreground)]"
              render={<Link href="/login" />}
              nativeButton={false}
            >
              {formatNumber(trialDays)} দিন ফ্রি চালিয়ে দেখুন{" "}
              <ArrowRightIcon />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-13 border-foreground/20 bg-background px-7 text-base"
              render={<a href="#how-it-works" />}
              nativeButton={false}
            >
              কীভাবে কাজ করে
            </Button>
          </div>
          <dl className="grid w-full max-w-lg grid-cols-3 divide-x divide-foreground/10 border-y border-foreground/10 py-4">
            {[
              { value: "৩০ সে.", label: "অর্ডার দিতে সময়" },
              { value: "০%", label: "অর্ডারে কমিশন" },
              { value: "২৪ ঘ.", label: "সর্বোচ্চ ফাইল রাখা" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col gap-0.5 px-3 first:pl-0"
              >
                <dt className="order-2 text-xs text-muted-foreground">
                  {stat.label}
                </dt>
                <dd className="order-1 text-2xl font-bold tracking-tight">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <PrinterScene />
      </div>
    </section>
  );
}

/** Printer's crop/registration mark, used as a corner ornament. */
function RegistrationMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("size-6 text-foreground/25", className)}
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      />
      <path d="M12 0v24M0 12h24" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}
