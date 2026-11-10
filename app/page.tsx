import Link from "next/link";
import { Suspense } from "react";
import {
  ArrowRightIcon,
  BanknoteIcon,
  BellRingIcon,
  CheckIcon,
  CpuIcon,
  FileTextIcon,
  MessageCircleIcon,
  MonitorIcon,
  PrinterIcon,
  ShieldCheckIcon,
  Trash2Icon,
  UsbIcon,
  WifiIcon,
} from "lucide-react";
import { BkashLogo } from "@/components/bkash";
import { Logo } from "@/components/logo";
import { PrintingPress } from "@/components/printing-press";
import { HeaderActions, SignedInHeaderActions } from "./header-actions";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { formatNumber, formatTaka } from "@/lib/constants";
import { env } from "@/lib/env";
import { cn } from "@/lib/utils";

const nav = [
  { href: "#how-it-works", label: "কীভাবে কাজ করে" },
  { href: "#features", label: "সুবিধা" },
  { href: "#pricing", label: "মূল্য" },
  { href: "#faq", label: "প্রশ্নোত্তর" },
];

// The four CMYK inks, used as the page's accent system.
const inks = ["bg-cyan-500", "bg-pink-500", "bg-yellow-400", "bg-foreground"];

const steps = [
  {
    title: "QR স্ক্যান",
    text: "কাউন্টারে লাগানো পোস্টারের QR কোড গ্রাহক নিজের ফোনে স্ক্যান করে।",
    ink: "text-cyan-600",
  },
  {
    title: "PDF আপলোড",
    text: "ফাইল দেয়, সাদা-কালো না রঙিন আর কয় কপি লাগবে তা বেছে নেয়।",
    ink: "text-pink-600",
  },
  {
    title: "পেমেন্ট",
    text: "বিকাশে টাকা দেয়, নয়তো কাউন্টারে ক্যাশ দেয়।",
    ink: "text-yellow-600",
  },
  {
    title: "প্রিন্ট!",
    text: "ঠিক মেশিনে নিজে থেকে প্রিন্ট হয়। গ্রাহক টোকেন দেখিয়ে কাগজ নিয়ে যায়।",
    ink: "text-foreground",
  },
];

const ticker = [
  "টোকেন #২৭ · assignment.pdf · ১২ পৃষ্ঠা · সাদা-কালো",
  "টোকেন #২৮ · CV-final.pdf · ২ পৃষ্ঠা · রঙিন",
  "টোকেন #২৯ · NID-copy.pdf · ১ পৃষ্ঠা · ৩ কপি",
  "টোকেন #৩০ · thesis-ch3.pdf · ৪৮ পৃষ্ঠা · সাদা-কালো",
  "টোকেন #৩১ · admit-card.pdf · ১ পৃষ্ঠা · রঙিন",
  "টোকেন #৩২ · lab-report.pdf · ৯ পৃষ্ঠা · ২ কপি",
];

const before = [
  { icon: UsbIcon, text: "পেনড্রাইভে ভাইরাস, ফাইল খুঁজতে খুঁজতে লাইন লম্বা" },
  {
    icon: MessageCircleIcon,
    text: "হোয়াটসঅ্যাপে শত শত ফাইল, কারটা কোনটা বোঝা দায়",
  },
  { icon: BanknoteIcon, text: "খুচরা টাকার হিসাব মেলে না দিনের শেষে" },
  {
    icon: FileTextIcon,
    text: "গ্রাহকের NID, সার্টিফিকেট পড়ে থাকে আপনার কম্পিউটারে",
  },
];

const after = [
  "গ্রাহক নিজেই ফাইল পাঠায়, নিজেই পেমেন্ট করে",
  "প্রতিটা অর্ডারের আলাদা টোকেন নম্বর",
  "প্রতিটা টাকার হিসাব ড্যাশবোর্ডে",
  "প্রিন্টের পরপরই ফাইল নিজে থেকে মুছে যায়",
];

const requirements = [
  {
    icon: MonitorIcon,
    title: "একটি Windows কম্পিউটার",
    text: "দোকান খোলা থাকলে চালু থাকে এমন",
  },
  {
    icon: PrinterIcon,
    title: "ইনস্টল করা প্রিন্টার",
    text: "Word থেকে প্রিন্ট হলেই চলবে",
  },
  { icon: WifiIcon, title: "ইন্টারনেট", text: "ব্রডব্যান্ড বা মোবাইল ডেটা" },
  {
    icon: CpuIcon,
    title: "আমাদের প্রিন্ট এজেন্ট",
    text: "একবার ইনস্টল, একটা কোড, ব্যাস",
  },
];

const faqs = [
  {
    q: "আমার পুরনো ফটোকপি মেশিনে কি চলবে?",
    a: "যদি মেশিনটি USB বা নেটওয়ার্কের মাধ্যমে কম্পিউটার থেকে প্রিন্ট নিতে পারে (প্রিন্টার ড্রাইভার থাকে), তাহলে চলবে। শুধু কাগজ কপি করার এনালগ মেশিনে কম্পিউটার থেকে প্রিন্ট করা যায় না, তাই সেগুলো যুক্ত করা যাবে না।",
  },
  {
    q: "বিকাশ মার্চেন্ট অ্যাকাউন্ট না থাকলে কি ব্যবহার করা যাবে?",
    a: "হ্যাঁ। শুরুতে ক্যাশ মোড ব্যবহার করতে পারেন — গ্রাহক নাম ও মোবাইল নম্বর দিয়ে অর্ডার দেবে, সাথে সাথে প্রিন্ট হবে, আপনি কাউন্টারে টাকা নেবেন। বিকাশ পেমেন্ট গেটওয়ে (PGW) অ্যাক্সেস পেলে সেটিংস থেকে যুক্ত করে নেবেন।",
  },
  {
    q: "গ্রাহকের টাকা কার কাছে যায়?",
    a: "সরাসরি আপনার নিজের বিকাশ মার্চেন্ট অ্যাকাউন্টে। আমরা শুধু প্রযুক্তি দিই, আপনার টাকা আমাদের কাছে আসে না।",
  },
  {
    q: "ইন্টারনেট চলে গেলে কী হবে?",
    a: "যেসব অর্ডারের পেমেন্ট হয়ে গেছে সেগুলো লাইনে থেকে যাবে। ইন্টারনেট ফিরলেই এজেন্ট আবার সংযুক্ত হয়ে প্রিন্ট শুরু করবে।",
  },
  {
    q: "প্রিন্টে কাগজ আটকে গেলে কী করব?",
    a: 'ড্যাশবোর্ড থেকে অর্ডারটি আবার প্রিন্ট করতে পারবেন, অথবা হাতে প্রিন্ট করে "সম্পন্ন" হিসেবে চিহ্নিত করতে পারবেন।',
  },
];

export default function HomePage() {
  const fee = env.deviceMonthlyFee;
  const trialDays = env.trialDays;

  return (
    <div className="flex flex-1 flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-foreground/10 bg-[oklch(0.985_0.008_85)]/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 md:px-6">
          <Logo className="h-8" />
          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((item) => (
              <Button
                key={item.href}
                variant="ghost"
                size="sm"
                render={<a href={item.href} />}
                nativeButton={false}
              >
                {item.label}
              </Button>
            ))}
          </nav>
          <Suspense fallback={<HeaderActions nav={nav} />}>
            <SignedInHeaderActions nav={nav} />
          </Suspense>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
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
                পেনড্রাইভ নয়,
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

        {/* Live queue ticker */}
        <div
          className="overflow-hidden border-b bg-foreground py-3 text-background"
          aria-hidden
        >
          <div className="animate-ticker flex w-max gap-10 font-mono text-sm whitespace-nowrap">
            {[...ticker, ...ticker].map((item, i) => (
              <span key={i} className="flex items-center gap-10">
                <span className="flex items-center gap-2">
                  <span className={cn("size-2 rounded-full", inks[i % 3])} />
                  {item}
                </span>
                <span className="text-background/30">✦</span>
              </span>
            ))}
          </div>
        </div>

        {/* Before / after */}
        <section className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-28">
          <SectionHeading
            eyebrow="আপনার কাউন্টারে প্রতিদিন"
            title="ভিড়ের সময়ের সেই হট্টগোল, এবার শেষ"
          />
          <div className="mt-14 grid gap-6 md:grid-cols-2">
            <div className="relative rounded-2xl border border-dashed border-foreground/25 bg-muted/40 p-6 md:-rotate-1 md:p-8">
              <span className="absolute -top-3 left-6 rounded-full bg-background px-3 text-sm font-semibold text-muted-foreground">
                আগে
              </span>
              <ul className="flex flex-col gap-5">
                {before.map((item) => (
                  <li
                    key={item.text}
                    className="flex items-start gap-3 text-foreground/70"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground">
                      <item.icon className="size-4" />
                    </span>
                    <span className="pt-1.5 decoration-rose-500/60 decoration-2 md:line-through">
                      {item.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative rounded-2xl bg-primary p-6 text-primary-foreground shadow-[6px_6px_0_0_var(--foreground)] md:rotate-1 md:p-8">
              <span className="absolute -top-3 left-6 rounded-full bg-yellow-300 px-3 text-sm font-semibold text-foreground">
                এখন
              </span>
              <ul className="flex flex-col gap-5">
                {after.map((text) => (
                  <li key={text} className="flex items-start gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/15">
                      <CheckIcon className="size-4" />
                    </span>
                    <span className="pt-1.5 font-medium">{text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* How it works: tear-off tickets */}
        <section
          id="how-it-works"
          className="bg-paper scroll-mt-16 border-y border-foreground/10"
        >
          <div className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-28">
            <SectionHeading
              eyebrow="কীভাবে কাজ করে"
              title="চার ধাপ। দোকানদারের হাত লাগে না একবারও।"
            />
            <ol className="mt-14 grid overflow-hidden rounded-2xl border border-foreground/15 bg-background md:grid-cols-4">
              {steps.map((step, i) => (
                <li
                  key={step.title}
                  className="relative flex flex-col gap-3 border-dashed border-foreground/25 p-6 not-last:border-b md:p-7 md:not-last:border-r md:not-last:border-b-0"
                >
                  <span
                    className={cn(
                      "font-mono text-6xl leading-none font-bold tracking-tighter",
                      step.ink,
                    )}
                  >
                    {formatNumber(i + 1).padStart(2, "০")}
                  </span>
                  <h3 className="text-xl font-bold">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {step.text}
                  </p>
                  {i < steps.length - 1 && (
                    <span className="absolute -right-3 -bottom-3 z-10 hidden size-6 rounded-full border border-foreground/15 bg-[oklch(0.985_0.008_85)] md:-top-3 md:bottom-auto md:block" />
                  )}
                  {i < steps.length - 1 && (
                    <span className="absolute -right-3 -bottom-3 z-10 hidden size-6 rounded-full border border-foreground/15 bg-[oklch(0.985_0.008_85)] md:block" />
                  )}
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Features bento */}
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

        {/* Requirements */}
        <section className="border-y border-foreground/10 bg-muted/40">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 md:px-6 md:py-24 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div className="flex flex-col gap-4">
              <Eyebrow>শুরু করতে যা লাগবে</Eyebrow>
              <h2 className="text-3xl leading-tight font-extrabold tracking-tight text-balance md:text-5xl">
                নতুন কোনো মেশিন কিনতে হবে না
              </h2>
              <p className="text-lg leading-relaxed text-muted-foreground">
                দোকানে এখন যা আছে, তা দিয়েই শুরু। প্রিন্ট এজেন্ট কম্পিউটারের
                কোণে চুপচাপ বসে থাকে আর অর্ডার এলেই ঠিক প্রিন্টারে পাঠিয়ে দেয়।
              </p>
            </div>
            <ul className="flex flex-col divide-y divide-foreground/10 rounded-2xl border border-foreground/15 bg-background">
              {requirements.map((item) => (
                <li key={item.title} className="flex items-center gap-4 p-5">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted">
                    <item.icon className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.text}</p>
                  </div>
                  <CheckIcon className="ml-auto size-5 shrink-0 text-emerald-600" />
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Pricing as a shop receipt */}
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

        {/* FAQ */}
        <section
          id="faq"
          className="scroll-mt-16 border-t border-foreground/10"
        >
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 md:px-6 md:py-28 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="flex flex-col gap-4">
              <Eyebrow>প্রশ্নোত্তর</Eyebrow>
              <h2 className="text-3xl leading-tight font-extrabold tracking-tight text-balance md:text-5xl">
                দোকানদাররা যা জানতে চান
              </h2>
            </div>
            <Accordion>
              {faqs.map((faq) => (
                <AccordionItem
                  key={faq.q}
                  value={faq.q}
                  className="border-foreground/15"
                >
                  <AccordionTrigger className="py-5 text-lg font-semibold">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-base leading-relaxed text-muted-foreground">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* CTA */}
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
      </main>

      <footer className="border-t border-foreground/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground md:flex-row md:px-6">
          <Logo />
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {nav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <span>© মুদ্রণ</span>
        </div>
      </footer>
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2 text-sm font-semibold text-primary">
      <span className="h-px w-6 bg-primary" />
      {children}
    </span>
  );
}

function SectionHeading({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="text-3xl leading-tight font-extrabold tracking-tight text-balance md:text-5xl">
        {title}
      </h2>
    </div>
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

/** A deterministic, decorative QR-like pattern (21×21 with three finder squares). */
const QR_SIZE = 21;
const qrCells = Array.from({ length: QR_SIZE * QR_SIZE }, (_, i) => {
  const x = i % QR_SIZE;
  const y = Math.floor(i / QR_SIZE);
  const finder = (fx: number, fy: number) => {
    const dx = x - fx;
    const dy = y - fy;
    if (dx < 0 || dy < 0 || dx > 6 || dy > 6) return null;
    const ring = dx === 0 || dy === 0 || dx === 6 || dy === 6;
    const core = dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4;
    return ring || core;
  };
  const f = finder(0, 0) ?? finder(14, 0) ?? finder(0, 14);
  if (f !== null) return f;
  if ((x === 7 || y === 7) && (x < 8 || y < 8)) return false;
  if (x === 13 && y < 8) return false;
  if (y === 13 && x < 8) return false;
  return (x * 7 + y * 13 + x * y * 3) % 5 < 2;
});

function FakeQr({ className }: { className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${QR_SIZE} ${QR_SIZE}`}
      className={className}
      aria-hidden
      shapeRendering="crispEdges"
    >
      {qrCells.map((on, i) =>
        on ? (
          <rect
            key={i}
            x={i % QR_SIZE}
            y={Math.floor(i / QR_SIZE)}
            width="1"
            height="1"
            fill="currentColor"
          />
        ) : null,
      )}
    </svg>
  );
}

/** Hero illustration: a printer feeding out the customer's order slip, with the QR poster beside it. */
function PrinterScene() {
  return (
    <div
      className="relative mx-auto w-full max-w-md pt-4 pb-6 lg:max-w-none"
      aria-hidden
    >
      {/* QR poster */}
      <div className="absolute top-0 -left-2 z-20 hidden w-28 -rotate-6 rounded-xl border border-foreground/15 bg-background p-2.5 shadow-xl md:block lg:-left-10">
        <FakeQr className="w-full text-foreground" />
        <p className="pt-1.5 text-center text-[0.7rem] font-semibold">
          স্ক্যান করে প্রিন্ট দিন
        </p>
      </div>

      <PrintingPress className="relative z-10 w-full drop-shadow-xl" />

      {/* Cash alert sticky note */}
      <div className="absolute right-0 bottom-0 z-20 hidden rotate-3 items-center gap-2 rounded-lg bg-yellow-300 px-3 py-2.5 text-foreground shadow-lg md:flex lg:-right-6">
        <BellRingIcon className="size-4" />
        <div className="leading-tight">
          <div className="text-xs">নতুন ক্যাশ অর্ডার</div>
          <div className="text-sm font-bold">টোকেন #২৮ · ৳২০</div>
        </div>
      </div>
    </div>
  );
}
