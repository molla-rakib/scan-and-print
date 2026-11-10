import Link from "next/link"
import { cn } from "@/lib/utils"

/**
 * The মুদ্রণ (Mudron) logo: printing press, name and tagline (public/images/logo.svg, 3829×1494).
 * Always links to the landing page. Size it by height with `className`, e.g. "h-8"; the width follows.
 */
export function Logo({ className, linkClassName }: { className?: string; linkClassName?: string }) {
  return (
    <Link href="/" aria-label="মুদ্রণ — হোম পেজ" className={cn("inline-flex shrink-0 rounded-md", linkClassName)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- static SVG */}
      <img src="/images/logo.svg" alt="মুদ্রণ" width={3829} height={1494} className={cn("h-10 w-auto", className)} />
    </Link>
  )
}
