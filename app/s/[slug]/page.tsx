import type { Metadata } from "next"
import { Suspense } from "react"
import { notFound } from "next/navigation"
import { connection } from "next/server"
import { MapPinIcon, StoreIcon } from "lucide-react"
import { Logo } from "@/components/logo"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { env } from "@/lib/env"
import { findShopBySlug, publicShopView } from "@/lib/public-shop"
import { PrintFlow } from "./print-flow"

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await connection()
  const shop = await findShopBySlug((await params).slug)
  return { title: shop ? `${shop.name} — প্রিন্ট করুন` : "দোকান পাওয়া যায়নি" }
}

export default function ShopPage({ params }: Props) {
  return (
    <div className="flex min-h-svh flex-col bg-muted/40">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 p-4 pt-6">
        <Suspense fallback={<Skeleton className="h-[480px]" />}>
          <Shop params={params} />
        </Suspense>
      </main>
      <footer className="flex justify-center py-6 text-xs text-muted-foreground">
        <Logo className="h-7" />
      </footer>
    </div>
  )
}

async function Shop({ params }: Props) {
  // Shop data must be fresh on every request (open/closed, printers online).
  await connection()
  const shop = await findShopBySlug((await params).slug)
  if (!shop) notFound()
  const view = await publicShopView(shop)

  return (
    <>
      <div className="flex items-center gap-3 px-1">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <StoreIcon className="size-5" />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold">{view.name}</h1>
          {view.address && (
            <p className="flex items-center gap-1 truncate text-sm text-muted-foreground">
              <MapPinIcon className="size-3.5 shrink-0" />
              {view.address}
            </p>
          )}
        </div>
      </div>

      {view.open && (view.payments.bkash || view.payments.cash) ? (
        <PrintFlow shop={view} maxUploadMb={Math.round(env.maxUploadBytes / 1024 / 1024)} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>এই দোকান এখন অনলাইন অর্ডার নিচ্ছে না</CardTitle>
            <CardDescription>অনুগ্রহ করে দোকানের কাউন্টারে যোগাযোগ করুন।</CardDescription>
          </CardHeader>
          <CardContent />
        </Card>
      )}
    </>
  )
}
