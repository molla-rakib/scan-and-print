import {
  BellRingIcon,
  PrinterIcon,
  ShieldCheckIcon,
  Trash2Icon,
} from "lucide-react";
import { BkashLogo } from "@/components/bkash";
import { cn } from "@/lib/utils";
import { SectionHeading } from "./section-heading";

/** Features bento. */
export function FeaturesSection() {
  return (
    <section id="features" className="scroll-mt-16">
      <div className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-28">
        <SectionHeading
          eyebrow="দোকান মালিকের সুবিধা"
          title="কম ঝামেলা, বেশি গ্রাহক, পরিষ্কার হিসাব"
        />
        <div className="mt-14 grid gap-4 lg:grid-cols-6">
          {/* Routing */}
          <BentoCard className="relative overflow-hidden bg-foreground text-background lg:col-span-4">
            <div
              aria-hidden
              className="bg-halftone pointer-events-none absolute inset-0 text-background/15"
            />
            <div className="relative grid gap-8 sm:grid-cols-2 sm:items-center">
              <div className="flex flex-col gap-3">
                <h3 className="text-2xl font-bold">
                  ঠিক মেশিন নিজেই বেছে নেয়
                </h3>
                <p className="leading-relaxed text-background/65">
                  রঙিন অর্ডার যায় রঙিন প্রিন্টারে, সাদা-কালো যায় কম খরচের
                  মেশিনে। কোন মেশিন ফাঁকা আছে, কোনটা বন্ধ — সব দেখে নেয়।
                </p>
              </div>
              <div
                className="flex flex-col gap-3 font-mono text-sm"
                aria-hidden
              >
                <RouteRow
                  from="সাদা-কালো · ১২ পৃ."
                  to="Canon iR 2520"
                  dot="bg-background"
                />
                <RouteRow
                  from="রঙিন · ২ পৃ."
                  to="Epson L3250"
                  dot="bg-pink-500"
                />
                <RouteRow
                  from="সাদা-কালো · ৪৮ পৃ."
                  to="HP LaserJet"
                  dot="bg-background"
                />
              </div>
            </div>
          </BentoCard>

          {/* bKash */}
          <BentoCard className="flex flex-col justify-between gap-6 bg-[#E2136E] text-white lg:col-span-2">
            <BkashLogo className="self-start px-2 py-1 [&_img]:h-6" />
            <div className="flex flex-col gap-2">
              <h3 className="text-xl font-bold">
                টাকা আসে সরাসরি আপনার কাছে
              </h3>
              <p className="text-sm leading-relaxed text-white/80">
                আপনার নিজের বিকাশ মার্চেন্ট অ্যাকাউন্টে। মাঝখানে আমরা নেই।
              </p>
            </div>
          </BentoCard>

          {/* Cash alert */}
          <BentoCard className="flex flex-col gap-4 bg-yellow-300 text-foreground lg:col-span-2">
            <span className="flex size-11 items-center justify-center rounded-full bg-foreground text-yellow-300">
              <BellRingIcon className="size-5" />
            </span>
            <h3 className="text-xl font-bold">
              ক্যাশ অর্ডারে টুং করে শব্দ
            </h3>
            <p className="text-sm leading-relaxed text-foreground/75">
              ক্যাশ অর্ডার সাথে সাথে প্রিন্ট হয় — কোনো ক্লিক লাগে না।
              ড্যাশবোর্ডে গ্রাহকের নাম, মোবাইল ও কত টাকা নিতে হবে দেখা যায়।
            </p>
          </BentoCard>

          {/* Live queue */}
          <BentoCard className="flex flex-col gap-4 border border-foreground/15 lg:col-span-2">
            <h3 className="text-xl font-bold">গ্রাহক ফোনেই দেখে লাইন</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              আগে কয়টা অর্ডার আছে, প্রিন্ট শুরু হলো কিনা — সব লাইভ।
              কাউন্টারে বারবার জিজ্ঞেস করা বন্ধ।
            </p>
            <div
              className="mt-auto flex flex-col gap-1.5 font-mono text-sm"
              aria-hidden
            >
              {[
                { t: "#২৭", s: "প্রিন্ট হচ্ছে", c: "bg-cyan-500" },
                { t: "#২৮", s: "লাইনে · ১ম", c: "bg-yellow-400" },
                { t: "#২৯", s: "লাইনে · ২য়", c: "bg-muted-foreground/40" },
              ].map((row) => (
                <div
                  key={row.t}
                  className="flex items-center gap-2 rounded-md bg-muted px-3 py-1.5"
                >
                  <span className={cn("size-2 rounded-full", row.c)} />
                  <span className="font-semibold">{row.t}</span>
                  <span className="ml-auto text-muted-foreground">
                    {row.s}
                  </span>
                </div>
              ))}
            </div>
          </BentoCard>

          {/* Any printer */}
          <BentoCard className="flex flex-col gap-4 border border-foreground/15 lg:col-span-2">
            <h3 className="text-xl font-bold">
              যেকোনো প্রিন্টার, যেকোনো ফটোকপি মেশিন
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Windows থেকে প্রিন্ট নিলেই হলো।
            </p>
            <div className="mt-auto flex flex-wrap gap-2" aria-hidden>
              {[
                "HP",
                "Canon",
                "Epson",
                "Brother",
                "Ricoh",
                "Konica",
                "Xerox",
              ].map((brand) => (
                <span
                  key={brand}
                  className="rounded-full border border-foreground/15 px-3 py-1 text-sm font-semibold"
                >
                  {brand}
                </span>
              ))}
            </div>
          </BentoCard>

          {/* Privacy */}
          <BentoCard className="flex flex-col gap-6 border border-foreground/15 bg-cyan-50 sm:flex-row sm:items-center lg:col-span-6">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-cyan-500 text-white">
              <ShieldCheckIcon className="size-7" />
            </span>
            <div className="flex flex-col gap-1">
              <h3 className="text-xl font-bold">
                গ্রাহকের ফাইল থাকে না আপনার কম্পিউটারে
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                NID, সার্টিফিকেট, ব্যাংক স্টেটমেন্ট — প্রিন্ট শেষ হওয়ামাত্র
                ফাইল নিজে থেকে মুছে যায়। গ্রাহক নিশ্চিন্তে পাঠাতে পারে।
              </p>
            </div>
            <span className="flex shrink-0 items-center gap-2 self-start rounded-full bg-background px-4 py-2 font-mono text-sm whitespace-nowrap sm:ml-auto sm:self-center">
              <Trash2Icon className="size-4 text-rose-500" /> NID-copy.pdf
              মুছে ফেলা হয়েছে
            </span>
          </BentoCard>
        </div>
      </div>
    </section>
  );
}

function BentoCard({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-2xl p-6 md:p-8", className)}>{children}</div>
  );
}

function RouteRow({
  from,
  to,
  dot,
}: {
  from: string;
  to: string;
  dot: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex items-center gap-2 rounded-md bg-background/10 px-2.5 py-1.5 whitespace-nowrap">
        <span className={cn("size-2 rounded-full", dot)} />
        {from}
      </span>
      <span className="h-px flex-1 border-t border-dashed border-background/35" />
      <span className="flex items-center gap-1.5 rounded-md border border-background/20 px-2.5 py-1.5 whitespace-nowrap">
        <PrinterIcon className="size-3.5" />
        {to}
      </span>
    </div>
  );
}
