import Link from "next/link"
import { Logo } from "@/components/logo"
import { WhatsAppIcon } from "@/components/whatsapp-icon"
import { siteNav } from "@/components/site-header"
import { SUPPORT_WHATSAPP } from "@/lib/constants"

const legal = [
  { href: "/terms", label: "শর্তাবলি" },
  { href: "/privacy", label: "গোপনীয়তা নীতি" },
  { href: "/support", label: "সাপোর্ট" },
]

export function SiteFooter() {
  return (
    <footer className="border-t border-foreground/10">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-8 text-sm text-muted-foreground md:px-6">
        <div className="flex w-full flex-col items-center justify-between gap-4 md:flex-row">
          <Logo />
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {siteNav.map((item) => (
              <a key={item.href} href={item.href} className="hover:text-foreground">
                {item.label}
              </a>
            ))}
          </nav>
        </div>
        <div className="flex w-full flex-col items-center justify-between gap-3 border-t border-foreground/10 pt-6 md:flex-row">
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {legal.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-foreground">
                {item.label}
              </Link>
            ))}
          </nav>
          <a
            href={SUPPORT_WHATSAPP.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 hover:text-foreground"
          >
            <WhatsAppIcon /> WhatsApp: {SUPPORT_WHATSAPP.display}
          </a>
          <span>© মুদ্রণ</span>
        </div>
      </div>
    </footer>
  )
}
