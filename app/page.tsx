import Link from "next/link"
import { Suspense } from "react"
import {
  ArrowRightIcon,
  BanknoteIcon,
  CheckIcon,
  CpuIcon,
  FileTextIcon,
  FileUpIcon,
  ListOrderedIcon,
  MonitorIcon,
  PrinterIcon,
  QrCodeIcon,
  RouteIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
  WalletIcon,
  WifiIcon,
} from "lucide-react"
import { BkashLogo } from "@/components/bkash"
import { Logo } from "@/components/logo"
import { HeaderActions, SignedInHeaderActions } from "./header-actions"
import { IconTile, type Tone } from "@/components/icon-tile"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { formatNumber, formatTaka } from "@/lib/constants"
import { env } from "@/lib/env"

const nav = [
  { href: "#how-it-works", label: "কীভাবে কাজ করে" },
  { href: "#features", label: "সুবিধা" },
  { href: "#pricing", label: "মূল্য" },
  { href: "#faq", label: "প্রশ্নোত্তর" },
]

const steps = [
  { icon: QrCodeIcon, title: "QR কোড স্ক্যান", text: "গ্রাহক কাউন্টারে রাখা QR কোড ফোনের ক্যামেরায় স্ক্যান করে।" },
  { icon: FileUpIcon, title: "PDF আপলোড", text: "ফাইল আপলোড করে সাদা-কালো বা রঙিন আর কপি সংখ্যা বেছে নেয়।" },
  { icon: WalletIcon, title: "পেমেন্ট", text: "বিকাশে পেমেন্ট করে, অথবা কাউন্টারে ক্যাশ দেয়।" },
  { icon: PrinterIcon, title: "স্বয়ংক্রিয় প্রিন্ট", text: "সঠিক প্রিন্টারে প্রিন্ট শুরু হয়। গ্রাহক টোকেন দেখিয়ে কাগজ নেয়।" },
]

const features = [
  {
    icon: RouteIcon,
    tone: "blue" as Tone,
    title: "সঠিক মেশিন নিজে বেছে নেয়",
    text: "রঙিন অর্ডার যায় রঙিন প্রিন্টারে, সাদা-কালো যায় কম খরচের মেশিনে। কোন মেশিন ফাঁকা, সেটাও দেখে নেয়।",
  },
  {
    icon: WalletIcon,
    tone: "rose" as Tone,
    title: "আপনার নিজের বিকাশ মার্চেন্ট",
    text: "গ্রাহকের টাকা সরাসরি আপনার বিকাশ মার্চেন্ট অ্যাকাউন্টে জমা হয়। আমরা আপনার টাকা ধরি না।",
  },
  {
    icon: BanknoteIcon,
    tone: "amber" as Tone,
    title: "ক্যাশ পেমেন্টের অপশন",
    text: "ক্যাশ অর্ডার আসলে সাউন্ড অ্যালার্ট বাজে। টাকা নিয়ে এক ক্লিকে অনুমোদন দিলেই প্রিন্ট শুরু।",
  },
  {
    icon: ListOrderedIcon,
    tone: "violet" as Tone,
    title: "লাইভ লাইন ও টোকেন",
    text: "গ্রাহক ফোনেই দেখে তার আগে কয়টা অর্ডার আছে। ভিড়ের সময় কাউন্টারে হৈচৈ কমে যায়।",
  },
  {
    icon: PrinterIcon,
    tone: "emerald" as Tone,
    title: "যেকোনো প্রিন্টার ও ফটোকপি মেশিন",
    text: "HP, Canon, Epson, Brother, Ricoh, Konica — Windows-এ যে মেশিন থেকে প্রিন্ট হয়, সেটাই কাজ করবে।",
  },
  {
    icon: ShieldCheckIcon,
    tone: "sky" as Tone,
    title: "গ্রাহকের ফাইল নিরাপদ",
    text: "NID, সার্টিফিকেটের মতো ব্যক্তিগত ফাইল প্রিন্টের পরপরই স্বয়ংক্রিয়ভাবে মুছে ফেলা হয়।",
  },
]

const requirements = [
  { icon: MonitorIcon, title: "একটি Windows কম্পিউটার", text: "যেটা দোকান খোলা থাকাকালীন চালু থাকে।" },
  { icon: PrinterIcon, title: "ইনস্টল করা প্রিন্টার", text: "কম্পিউটার থেকে Word ফাইল প্রিন্ট হলেই যথেষ্ট।" },
  { icon: WifiIcon, title: "ইন্টারনেট সংযোগ", text: "সাধারণ ব্রডব্যান্ড বা মোবাইল ডেটাই যথেষ্ট।" },
  { icon: CpuIcon, title: "আমাদের প্রিন্ট এজেন্ট", text: "একবার ইনস্টল করে কোড দিলেই হয়ে গেল।" },
]

const faqs = [
  {
    q: "আমার পুরনো ফটোকপি মেশিনে কি চলবে?",
    a: "যদি মেশিনটি USB বা নেটওয়ার্কের মাধ্যমে কম্পিউটার থেকে প্রিন্ট নিতে পারে (প্রিন্টার ড্রাইভার থাকে), তাহলে চলবে। শুধু কাগজ কপি করার এনালগ মেশিনে কম্পিউটার থেকে প্রিন্ট করা যায় না, তাই সেগুলো যুক্ত করা যাবে না।",
  },
  {
    q: "বিকাশ মার্চেন্ট অ্যাকাউন্ট না থাকলে কি ব্যবহার করা যাবে?",
    a: "হ্যাঁ। শুরুতে ক্যাশ মোড ব্যবহার করতে পারেন — গ্রাহক অর্ডার দেবে, আপনি টাকা নিয়ে অনুমোদন দেবেন। বিকাশ পেমেন্ট গেটওয়ে (PGW) অ্যাক্সেস পেলে সেটিংস থেকে যুক্ত করে নেবেন।",
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
    a: "ড্যাশবোর্ড থেকে অর্ডারটি আবার প্রিন্ট করতে পারবেন, অথবা হাতে প্রিন্ট করে \"সম্পন্ন\" হিসেবে চিহ্নিত করতে পারবেন।",
  },
]

export default function HomePage() {
  const fee = env.deviceMonthlyFee
  const trialDays = env.trialDays

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 md:px-6">
          <Link href="/">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((item) => (
              <Button key={item.href} variant="ghost" size="sm" render={<a href={item.href} />} nativeButton={false}>
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
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-linear-to-b from-primary/6 via-transparent to-transparent"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -top-40 left-1/2 size-[700px] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl"
          />
          <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 py-16 md:px-6 md:py-24 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="flex flex-col items-start gap-6">
              <Badge variant="outline" className="h-7 gap-2 bg-background px-3 text-sm font-normal">
                <span className="size-2 rounded-full bg-emerald-500" />
                বাংলাদেশের প্রিন্ট ও ফটোকপি দোকানের জন্য
              </Badge>
              <h1 className="text-4xl leading-[1.2] font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl lg:leading-[1.15]">
                প্রিন্টের দোকান চলুক <span className="bg-linear-to-r from-primary to-violet-600 bg-clip-text text-transparent">স্বয়ংক্রিয়ভাবে</span>
              </h1>
              <p className="max-w-xl text-lg leading-relaxed text-pretty text-muted-foreground">
                গ্রাহক QR কোড স্ক্যান করে PDF আপলোড করবে, বিকাশে পেমেন্ট করবে — আর প্রিন্ট নিজে নিজেই শুরু হবে সঠিক মেশিনে। পেনড্রাইভ,
                ইমেইল বা হোয়াটসঅ্যাপে ফাইল নেওয়ার ঝামেলা শেষ।
              </p>
              <div className="flex flex-wrap gap-3">
                <Button size="lg" className="h-12 px-6 text-base" render={<Link href="/login" />} nativeButton={false}>
                  {formatNumber(trialDays)} দিন ফ্রি ব্যবহার করুন <ArrowRightIcon />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 bg-background px-6 text-base"
                  render={<a href="#how-it-works" />}
                  nativeButton={false}
                >
                  কীভাবে কাজ করে
                </Button>
              </div>
              <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                {["কোনো সেটআপ ফি নেই", "নিজের বিকাশ মার্চেন্ট", "যেকোনো প্রিন্টার"].map((item) => (
                  <li key={item} className="flex items-center gap-1.5">
                    <CheckIcon className="size-4 text-emerald-600" /> {item}
                  </li>
                ))}
              </ul>
            </div>
            <HeroMockup />
          </div>
        </section>

        {/* Stats */}
        <section className="border-y bg-muted/30">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-10 md:grid-cols-4 md:px-6">
            {[
              { value: "৩০ সেকেন্ড", label: "গ্রাহকের অর্ডার দিতে লাগে" },
              { value: "০", label: "ফাইল আদান-প্রদানের ঝামেলা" },
              { value: "১০০%", label: "পেমেন্ট সরাসরি আপনার অ্যাকাউন্টে" },
              { value: "২৪ ঘণ্টা", label: "সর্বোচ্চ ফাইল সংরক্ষণ" },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col gap-1 text-center">
                <span className="text-2xl font-bold tracking-tight md:text-3xl">{stat.value}</span>
                <span className="text-sm text-muted-foreground">{stat.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-16">
          <div className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-28">
            <SectionHeading eyebrow="কীভাবে কাজ করে" title="চারটি ধাপে প্রিন্ট — দোকানদারের কোনো হাত লাগে না" />
            <ol className="relative mt-14 grid gap-8 md:grid-cols-4">
              <div aria-hidden className="absolute top-6 right-[12.5%] left-[12.5%] hidden h-px bg-border md:block" />
              {steps.map((step, i) => (
                <li key={step.title} className="relative flex flex-col items-center gap-3 text-center">
                  <span className="relative flex size-12 items-center justify-center rounded-full border bg-background shadow-sm">
                    <step.icon className="size-5" />
                    <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                      {formatNumber(i + 1)}
                    </span>
                  </span>
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="max-w-56 text-sm text-muted-foreground">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-16 border-y bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-28">
            <SectionHeading eyebrow="দোকান মালিকের জন্য সুবিধা" title="কম ঝামেলা, বেশি গ্রাহক, পরিষ্কার হিসাব" />
            <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <Card key={feature.title} className="transition-shadow hover:shadow-md">
                  <CardHeader>
                    <IconTile icon={feature.icon} tone={feature.tone} className="mb-3 size-10 rounded-lg" />
                    <CardTitle className="text-base">{feature.title}</CardTitle>
                    <CardDescription className="leading-relaxed">{feature.text}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Requirements */}
        <section>
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 md:px-6 md:py-28 lg:grid-cols-2">
            <div className="flex flex-col gap-4">
              <span className="text-sm font-medium text-primary">শুরু করতে যা লাগবে</span>
              <h2 className="text-3xl leading-tight font-bold tracking-tight text-balance md:text-4xl">
                নতুন কোনো মেশিন কিনতে হবে না
              </h2>
              <p className="text-lg leading-relaxed text-muted-foreground">
                আপনার দোকানে এখন যা আছে, তা দিয়েই শুরু করুন। প্রিন্ট এজেন্ট আপনার কম্পিউটারে চুপচাপ চলে আর অর্ডার এলে সঠিক প্রিন্টারে পাঠিয়ে
                দেয়।
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {requirements.map((item) => (
                <div key={item.title} className="flex flex-col gap-2 rounded-xl border p-5">
                  <item.icon className="size-5 text-muted-foreground" />
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="scroll-mt-16 border-y bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-28">
            <SectionHeading eyebrow="মূল্য" title="যত মেশিন, তত খরচ — এর বেশি কিছু না" />
            <Card className="mx-auto mt-14 max-w-md shadow-lg">
              <CardHeader className="text-center">
                <CardDescription>প্রতিটি প্রিন্টার বা ফটোকপি মেশিন</CardDescription>
                <div className="flex items-baseline justify-center gap-1 py-2">
                  <span className="text-5xl font-bold tracking-tight">{formatTaka(fee)}</span>
                  <span className="text-muted-foreground">/মাস</span>
                </div>
                <CardDescription>
                  যেমন: ১টি প্রিন্টার + ১টি ফটোকপি মেশিন = {formatTaka(fee * 2)}/মাস
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-3 text-sm">
                  {[
                    "সীমাহীন প্রিন্ট অর্ডার",
                    "নিজের বিকাশ মার্চেন্ট সংযোগ",
                    "ক্যাশ মোড ও সাউন্ড অ্যালার্ট",
                    "QR কোড পোস্টার",
                    "অর্ডার ও আয়ের হিসাব",
                    "প্রতি অর্ডারে কোনো কমিশন নেই",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <CheckIcon className="size-4 shrink-0 text-emerald-600" /> {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="flex-col gap-2 border-t pt-4">
                <Button size="lg" className="h-11 w-full text-base" render={<Link href="/login" />} nativeButton={false}>
                  {formatNumber(trialDays)} দিন ফ্রি ট্রায়াল শুরু করুন
                </Button>
                <span className="text-xs text-muted-foreground">ট্রায়ালে কোনো কার্ড বা পেমেন্ট লাগবে না</span>
              </CardFooter>
            </Card>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-16">
          <div className="mx-auto max-w-3xl px-4 py-20 md:px-6 md:py-28">
            <SectionHeading eyebrow="প্রশ্নোত্তর" title="সাধারণ কিছু প্রশ্ন" />
            <Accordion className="mt-12">
              {faqs.map((faq) => (
                <AccordionItem key={faq.q} value={faq.q}>
                  <AccordionTrigger className="text-base">{faq.q}</AccordionTrigger>
                  <AccordionContent className="leading-relaxed text-muted-foreground">{faq.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 pb-20 md:px-6">
          <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-6 overflow-hidden rounded-3xl bg-primary px-6 py-16 text-center text-primary-foreground">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-20 -bottom-32 size-96 rounded-full bg-violet-500/40 blur-3xl"
            />
            <h2 className="relative max-w-2xl text-3xl leading-tight font-bold tracking-tight text-balance md:text-4xl">
              আজই আপনার দোকানকে স্মার্ট করে তুলুন
            </h2>
            <p className="relative max-w-xl text-primary-foreground/70">
              Gmail দিয়ে লগইন করুন, দোকান সেটআপ করুন, প্রিন্টার যুক্ত করুন — ১০ মিনিটেই প্রথম অর্ডার নিতে পারবেন।
            </p>
            <Button
              size="lg"
              variant="secondary"
              className="relative h-12 px-6 text-base"
              render={<Link href="/login" />}
              nativeButton={false}
            >
              ফ্রি শুরু করুন <ArrowRightIcon />
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground md:flex-row md:px-6">
          <Logo className="text-foreground" />
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {nav.map((item) => (
              <a key={item.href} href={item.href} className="hover:text-foreground">
                {item.label}
              </a>
            ))}
          </nav>
          <span>© স্ক্যান অ্যান্ড প্রিন্ট</span>
        </div>
      </footer>
    </div>
  )
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 text-center">
      <span className="text-sm font-medium text-primary">{eyebrow}</span>
      <h2 className="text-3xl leading-tight font-bold tracking-tight text-balance md:text-4xl">{title}</h2>
    </div>
  )
}

/** Illustration of the customer's phone screen, built from plain elements. */
function HeroMockup() {
  return (
    <div className="relative mx-auto w-full max-w-sm" aria-hidden>
      <div className="relative rounded-[2.5rem] border-8 border-foreground/90 bg-background p-4 shadow-2xl">
        <div className="mx-auto mb-4 h-1.5 w-16 rounded-full bg-muted" />
        <div className="flex items-center gap-2 pb-4">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <SmartphoneIcon className="size-4" />
          </span>
          <div>
            <div className="text-sm font-semibold">রহিম ফটোকপি</div>
            <div className="text-xs text-muted-foreground">নীলক্ষেত, ঢাকা</div>
          </div>
        </div>
        <div className="flex flex-col gap-3 rounded-2xl border p-3">
          <div className="flex items-center gap-2 rounded-lg bg-muted p-2.5">
            <FileTextIcon className="size-6 text-muted-foreground" />
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">assignment.pdf</div>
              <div className="text-xs text-muted-foreground">১২ পৃষ্ঠা</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg border-2 border-primary bg-primary/5 p-2">
              <div className="font-medium">সাদা-কালো</div>
              <div className="text-xs text-muted-foreground">৳৩/পৃষ্ঠা</div>
            </div>
            <div className="rounded-lg border p-2">
              <div className="font-medium">রঙিন</div>
              <div className="text-xs text-muted-foreground">৳১০/পৃষ্ঠা</div>
            </div>
          </div>
          <div className="flex items-end justify-between border-t pt-3">
            <span className="text-xs text-muted-foreground">১২ পৃষ্ঠা × ২ কপি</span>
            <span className="text-xl font-bold">৳৭২</span>
          </div>
          <div className="flex items-center justify-center gap-2 rounded-md bg-[#E2136E] py-2.5 text-sm font-medium text-white">
            <BkashLogo className="px-1 py-0.5 [&_img]:h-4" /> দিয়ে পেমেন্ট করুন
          </div>
        </div>
      </div>

      <div className="absolute top-16 -left-6 flex items-center gap-2 rounded-xl border bg-background p-3 shadow-lg sm:-left-14">
        <span className="flex size-8 items-center justify-center rounded-full bg-violet-500/15 text-violet-600">
          <PrinterIcon className="size-4" />
        </span>
        <div>
          <div className="text-xs text-muted-foreground">টোকেন #২৭</div>
          <div className="text-sm font-semibold">প্রিন্ট হচ্ছে…</div>
        </div>
      </div>

      <div className="absolute -right-4 bottom-20 flex items-center gap-2 rounded-xl border bg-background p-3 shadow-lg sm:-right-10">
        <span className="flex size-8 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
          <CheckIcon className="size-4" />
        </span>
        <div>
          <div className="text-xs text-muted-foreground">পেমেন্ট সফল</div>
          <div className="text-sm font-semibold">৳৭২ পেয়েছেন</div>
        </div>
      </div>
    </div>
  )
}
