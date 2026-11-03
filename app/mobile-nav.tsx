"use client"

import Link from "next/link"
import { MenuIcon } from "lucide-react"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

export function MobileNav({ items, dashboardHref }: { items: { href: string; label: string }[]; dashboardHref?: string }) {
  return (
    <Sheet>
      <SheetTrigger render={<Button variant="ghost" size="icon" className="md:hidden" aria-label="মেনু" />}>
        <MenuIcon className="size-5" />
      </SheetTrigger>
      <SheetContent side="right" className="w-72">
        <SheetHeader>
          <SheetTitle>
            <Logo />
          </SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 px-4">
          {items.map((item) => (
            <SheetClose
              key={item.href}
              render={<a href={item.href} className="rounded-md px-3 py-2.5 text-base hover:bg-accent hover:text-accent-foreground" />}
            >
              {item.label}
            </SheetClose>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-2 p-4">
          {dashboardHref ? (
            <Button size="lg" className="h-11" render={<Link href={dashboardHref} />} nativeButton={false}>
              ড্যাশবোর্ডে যান
            </Button>
          ) : (
            <>
              <Button variant="outline" size="lg" className="h-11" render={<Link href="/login" />} nativeButton={false}>
                লগইন
              </Button>
              <Button size="lg" className="h-11" render={<Link href="/login" />} nativeButton={false}>
                ফ্রি শুরু করুন
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
