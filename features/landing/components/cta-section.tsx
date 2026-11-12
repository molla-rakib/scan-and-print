import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { inks } from "../content";

/** CTA. */
export function CtaSection() {
  return (
    <section className="px-4 pb-20 md:px-6">
      <div className="relative mx-auto flex max-w-6xl flex-col items-start gap-8 overflow-hidden rounded-3xl bg-foreground px-6 py-14 text-background md:flex-row md:items-end md:justify-between md:px-14 md:py-20">
        <div
          aria-hidden
          className="bg-halftone pointer-events-none absolute inset-0 text-cyan-400/25"
        />
        <div
          aria-hidden
          className="absolute top-0 right-0 left-0 flex h-1.5"
        >
          {inks.slice(0, 3).map((ink) => (
            <span key={ink} className={cn("flex-1", ink)} />
          ))}
        </div>
        <div className="relative flex max-w-2xl flex-col gap-4">
          <h2 className="text-3xl leading-tight font-extrabold tracking-tight text-balance md:text-5xl">
            আজ দোকান খোলার আগেই সেটআপ হয়ে যাবে
          </h2>
          <p className="text-lg text-background/65">
            Gmail দিয়ে লগইন, দোকানের নাম, প্রিন্টার যুক্ত — ১০ মিনিটে প্রথম
            অর্ডার।
          </p>
        </div>
        <Button
          size="lg"
          className="relative h-13 shrink-0 bg-yellow-300 px-7 text-base text-foreground hover:bg-yellow-200"
          render={<Link href="/login" />}
          nativeButton={false}
        >
          ফ্রি শুরু করুন <ArrowRightIcon />
        </Button>
      </div>
    </section>
  );
}
