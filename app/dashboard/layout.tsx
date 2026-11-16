import { Suspense } from "react"
import { Logo } from "@/components/logo"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { AppSidebar } from "@/features/dashboard-shell/components/app-sidebar"
import { SidebarAdminItem, SidebarUser } from "@/features/dashboard-shell/components/sidebar-slots"
import { SubscriptionBanner } from "@/features/dashboard-shell/components/subscription-banner"
import type { Metadata } from "next"

// Signed-in area: keep it out of search results (robots.txt also disallows it).
export const metadata: Metadata = { robots: { index: false, follow: false } }

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <SidebarProvider>
      <AppSidebar
        extraItems={
          <Suspense>
            <SidebarAdminItem />
          </Suspense>
        }
        footer={
          <Suspense fallback={<Skeleton className="h-12 w-full" />}>
            <SidebarUser />
          </Suspense>
        }
      />
      <SidebarInset className="bg-muted/50">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur sm:px-6 lg:px-8">
          <SidebarTrigger className="-ml-1" />
          <Logo className="h-8 md:hidden" />
          <span className="hidden text-sm text-muted-foreground md:inline">দোকান ড্যাশবোর্ড</span>
        </header>
        <Suspense>
          <SubscriptionBanner />
        </Suspense>
        <div className="flex w-full flex-1 flex-col gap-8 p-4 sm:p-6 lg:p-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
