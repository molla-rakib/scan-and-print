import Link from "next/link"
import { LayoutDashboardIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getCurrentUser } from "@/lib/auth"
import { MobileNav } from "./mobile-nav"

type NavItem = { href: string; label: string }

/** Header buttons for visitors; swapped for a dashboard link when the visitor is signed in. */
export function HeaderActions({ nav, dashboardHref }: { nav: NavItem[]; dashboardHref?: string }) {
  return (
    <div className="flex items-center gap-2">
      {dashboardHref ? (
        <Button size="sm" className="hidden sm:inline-flex" render={<Link href={dashboardHref} />} nativeButton={false}>
          <LayoutDashboardIcon /> ড্যাশবোর্ড
        </Button>
      ) : (
        <>
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex" render={<Link href="/login" />} nativeButton={false}>
            লগইন
          </Button>
          <Button size="sm" className="hidden sm:inline-flex" render={<Link href="/login" />} nativeButton={false}>
            ফ্রি শুরু করুন
          </Button>
        </>
      )}
      <MobileNav items={nav} dashboardHref={dashboardHref} />
    </div>
  )
}

export async function SignedInHeaderActions({ nav }: { nav: NavItem[] }) {
  const user = await getCurrentUser()
  return <HeaderActions nav={nav} dashboardHref={user ? (user.isAdmin ? "/dashboard/admin" : "/dashboard") : undefined} />
}
