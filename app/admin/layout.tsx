import Link from "next/link"
import { Logo } from "@/components/logo"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-svh flex-col bg-muted/50">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="flex h-16 w-full items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Logo />
            <Badge className="hidden bg-rose-500/10 text-rose-700 sm:inline-flex">অ্যাডমিন</Badge>
          </div>
          <Button variant="ghost" size="sm" render={<Link href="/dashboard" />} nativeButton={false}>
            দোকান ড্যাশবোর্ড
          </Button>
        </div>
      </header>
      <main className="flex w-full flex-1 flex-col gap-8 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  )
}
