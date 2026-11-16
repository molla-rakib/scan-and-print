import Link from "next/link"
import { BookOpenIcon, HelpCircleIcon } from "lucide-react"
import { Bullets, ContentPage, Section, WhatsAppHelp } from "@/components/content-page"
import { WhatsAppIcon } from "@/components/whatsapp-icon"
import { SUPPORT_WHATSAPP } from "@/lib/constants"

const cards = [
  {
    icon: WhatsAppIcon,
    title: "WhatsApp",
    text: SUPPORT_WHATSAPP.display,
    href: SUPPORT_WHATSAPP.href,
    external: true,
  },
  { icon: BookOpenIcon, title: "ইনস্টল গাইড", text: "এজেন্ট সেটআপের ধাপগুলো", href: "/guide", external: false },
  { icon: HelpCircleIcon, title: "প্রশ্নোত্তর", text: "সাধারণ প্রশ্নের উত্তর", href: "/#faq", external: false },
]

/** /support: how to reach us. */
export function SupportPage() {
  return (
    <ContentPage
      eyebrow="সাপোর্ট"
      title="আমরা সাহায্য করতে প্রস্তুত"
      intro="ইনস্টল, প্রিন্টার, পেমেন্ট বা বিল নিয়ে যেকোনো প্রশ্ন বা সমস্যায় আমাদের জানান।"
    >
      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            {...(card.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="flex flex-col gap-2 rounded-xl border p-5 transition-colors hover:border-primary hover:bg-primary/5"
          >
            <card.icon className="size-6 text-primary" />
            <span className="font-semibold">{card.title}</span>
            <span className="text-sm text-muted-foreground">{card.text}</span>
          </Link>
        ))}
      </div>

      <Section title="মেসেজ দেওয়ার সময় যা লিখবেন">
        <p>দ্রুত সমাধানের জন্য মেসেজে এগুলো দিন:</p>
        <Bullets
          items={[
            "দোকানের নাম বা দোকানের লিংক",
            "সমস্যাটা কী, আর কখন থেকে হচ্ছে",
            "স্ক্রিনে কোনো লেখা বা এরর দেখালে তার স্ক্রিনশট",
            "অর্ডারের সমস্যা হলে টোকেন নম্বর",
          ]}
        />
      </Section>

      <Section title="গ্রাহকদের জন্য">
        <p>
          প্রিন্ট, পেমেন্ট বা টাকা ফেরত নিয়ে প্রশ্ন থাকলে প্রথমে যে দোকানে অর্ডার দিয়েছেন সেই দোকানের সাথে যোগাযোগ করুন। বিকাশে দেওয়া
          টাকা সরাসরি দোকানের অ্যাকাউন্টে যায়, তাই টাকা ফেরত দোকানই দেয়। দোকানের সাথে সমাধান না হলে আমাদের জানাতে পারেন।
        </p>
      </Section>

      <WhatsAppHelp />
    </ContentPage>
  )
}
