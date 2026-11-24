import { Suspense } from "react"
import { notFound } from "next/navigation"
import { connection } from "next/server"
import { MapPinIcon, StoreIcon } from "lucide-react"
import { Logo } from "@/components/logo"
import { Skeleton } from "@/components/ui/skeleton"
import { env } from "@/lib/env"
import { PrintFlow } from "./components/print-flow"
import { shopOrderView } from "./queries"

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ counter?: string }> }

/** /s/[slug]: the customer uploads files, picks how they print and pays. */
export function ShopOrderPage({ params, searchParams }: Props) {
  return (
    <div className="flex min-h-svh flex-col bg-muted/50">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 pt-8 pb-4">
        <Suspense fallback={<Skeleton className="h-[480px] rounded-2xl" />}>
          <Shop params={params} searchParams={searchParams} />
        </Suspense>
      </main>
      <footer className="flex justify-center py-8 text-xs text-muted-foreground">
        <Logo className="h-7 opacity-80" />
      </footer>
    </div>
  )
}

async function Shop({ params, searchParams }: Props) {
  // Shop data must be fresh on every request (open/closed, printers online).
  await connection()
  const found = await shopOrderView((await params).slug, (await searchParams).counter === "1")
  if (!found) notFound()
  const { view, counter } = found

  return (
    <>
      <header className="flex items-center gap-3.5 px-1">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-linear-to-b from-primary/85 to-primary text-primary-foreground shadow-md shadow-primary/25">
          <StoreIcon className="size-6" />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-2xl leading-tight font-bold tracking-tight">{view.name}</h1>
          {view.address && (
            <p className="flex items-center gap-1 truncate text-sm text-muted-foreground">
              <MapPinIcon className="size-3.5 shrink-0" />
              {view.address}
            </p>
          )}
        </div>
      </header>

      {view.open && (view.payments.bkash || view.payments.cash) ? (
        <PrintFlow shop={view} counter={counter} maxUploadMb={Math.round(env.maxUploadBytes / 1024 / 1024)} />
      ) : (
        <section className="flex flex-col items-center gap-3 rounded-2xl bg-card px-6 py-10 text-center shadow-sm ring-1 ring-foreground/5">
          <span className="flex size-14 items-center justify-center rounded-full bg-foreground/[0.06] text-muted-foreground">
            <StoreIcon className="size-6" />
          </span>
          <h2 className="text-lg font-semibold tracking-tight">এই মুহূর্তে অনলাইন অর্ডার বন্ধ আছে</h2>
          <p className="text-sm text-muted-foreground">প্রিন্ট করাতে দোকানের কাউন্টারে যোগাযোগ করুন।</p>
        </section>
      )}
    </>
  )
}
