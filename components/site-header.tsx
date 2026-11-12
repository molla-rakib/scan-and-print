import { Suspense } from "react"
import { HeaderActions, SignedInHeaderActions } from "@/components/header-actions"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"

/** Top navigation of the public pages. Section links point at the home page, so they work from any page. */
export const siteNav = [
  { href: "/#how-it-works", label: "কীভাবে কাজ করে" },
  { href: "/#features", label: "সুবিধা" },
  { href: "/#pricing", label: "মূল্য" },
  { href: "/#faq", label: "প্রশ্নোত্তর" },
  { href: "/guide", label: "ইনস্টল গাইড" },
]

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-foreground/10 bg-[oklch(0.985_0.008_85)]/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 md:px-6">
        <Logo className="h-8" />
        <nav className="hidden items-center gap-1 lg:flex">
          {siteNav.map((item) => (
            <Button key={item.href} variant="ghost" size="sm" render={<a href={item.href} />} nativeButton={false}>
              {item.label}
            </Button>
          ))}
        </nav>
        <Suspense fallback={<HeaderActions nav={siteNav} />}>
          <SignedInHeaderActions nav={siteNav} />
        </Suspense>
      </div>
    </header>
  )
}
