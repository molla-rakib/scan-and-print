import { Suspense } from "react"
import { AdminNavItem, AppSidebar, PendingBadge, UserMenu } from "@/app/dashboard/app-sidebar"
import { Logo } from "@/components/logo"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { requireShop } from "@/lib/auth"
import { PrintJob } from "@/lib/models"

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <SidebarProvider>
      <AppSidebar
        jobsBadge={
          <Suspense>
            <SidebarPendingBadge />
          </Suspense>
        }
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
          <Logo className="text-sm md:hidden" />
          <span className="hidden text-sm text-muted-foreground md:inline">দোকান ড্যাশবোর্ড</span>
        </header>
        <div className="flex w-full flex-1 flex-col gap-8 p-4 sm:p-6 lg:p-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}

async function SidebarPendingBadge() {
  const { shop } = await requireShop()
  return <PendingBadge count={await PrintJob.countDocuments({ shopId: shop._id, status: "awaiting_approval" })} />
}

async function SidebarAdminItem() {
  const { user } = await requireShop()
  return user.isAdmin ? <AdminNavItem /> : null
}

async function SidebarUser() {
  const { user, shop } = await requireShop()
  return <UserMenu shopName={shop.name} email={user.email} />
}
