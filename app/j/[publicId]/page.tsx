import type { Metadata } from "next"
import { Suspense } from "react"
import { notFound } from "next/navigation"
import { connection } from "next/server"
import { Logo } from "@/components/logo"
import { Skeleton } from "@/components/ui/skeleton"
import { connectDb } from "@/lib/db"
import { Order, Shop } from "@/lib/models"
import { publicOrderView } from "@/lib/public-shop"
import { JobStatusView } from "./job-status"

export const metadata: Metadata = { title: "অর্ডারের অবস্থা", robots: { index: false } }

type Props = { params: Promise<{ publicId: string }>; searchParams: Promise<{ payment?: string }> }

export default function JobPage(props: Props) {
  return (
    <div className="flex min-h-svh flex-col bg-muted/40">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 p-4 pt-6">
        <Suspense fallback={<Skeleton className="h-[480px]" />}>
          <Job {...props} />
        </Suspense>
      </main>
      <footer className="flex justify-center py-6 text-xs text-muted-foreground">
        <Logo className="h-7" />
      </footer>
    </div>
  )
}

async function Job({ params, searchParams }: Props) {
  const [{ publicId }, { payment }] = await Promise.all([params, searchParams])
  await connection()
  await connectDb()
  const order = await Order.findOne({ publicId })
  const shop = order && (await Shop.findById(order.shopId))
  if (!order || !shop || order.status === "draft") notFound()

  return <JobStatusView initial={await publicOrderView(order, shop)} paymentResult={payment ?? null} />
}
