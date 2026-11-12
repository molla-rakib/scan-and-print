import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { WhatsAppIcon } from "@/components/whatsapp-icon"
import { SUPPORT_WHATSAPP } from "@/lib/constants"
import { cn } from "@/lib/utils"

/** Public text page (guide, terms, privacy, support): site header, a title block, the content and the footer. */
export function ContentPage({
  eyebrow,
  title,
  intro,
  updated,
  children,
}: {
  eyebrow: string
  title: string
  intro?: React.ReactNode
  updated?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-1 flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <section className="bg-paper border-b border-foreground/10">
          <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-12 md:px-6 md:py-16">
            <span className="flex items-center gap-2 text-sm font-semibold text-primary">
              <span className="h-px w-6 bg-primary" />
              {eyebrow}
            </span>
            <h1 className="text-3xl leading-tight font-extrabold tracking-tight text-balance md:text-5xl">{title}</h1>
            {intro && <p className="text-lg text-muted-foreground">{intro}</p>}
            {updated && <p className="text-sm text-muted-foreground">সর্বশেষ হালনাগাদ: {updated}</p>}
          </div>
        </section>
        <div className="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-12 md:px-6">{children}</div>
      </main>
      <SiteFooter />
    </div>
  )
}

/** A titled section of a content page. */
export function Section({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="flex scroll-mt-24 flex-col gap-3 leading-relaxed">
      <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      {children}
    </section>
  )
}

/** Bullet list with comfortable spacing. */
export function Bullets({ items, className }: { items: React.ReactNode[]; className?: string }) {
  return (
    <ul className={cn("flex list-disc flex-col gap-1.5 pl-6 marker:text-primary", className)}>
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  )
}

/** "Need help? WhatsApp us" box. */
export function WhatsAppHelp({ text = "কোনো সমস্যা হলে বা বুঝতে না পারলে আমাদের WhatsApp-এ মেসেজ দিন।" }: { text?: string }) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1">
        <span className="font-semibold">সাহায্য লাগবে?</span>
        <span className="text-muted-foreground">{text}</span>
      </div>
      <Button
        variant="outline"
        size="lg"
        className="h-11 shrink-0 bg-background"
        render={<a href={SUPPORT_WHATSAPP.href} target="_blank" rel="noopener noreferrer" />}
        nativeButton={false}
      >
        <WhatsAppIcon className="size-6" /> {SUPPORT_WHATSAPP.display}
      </Button>
    </div>
  )
}
