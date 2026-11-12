import { Suspense } from "react"
import { notFound } from "next/navigation"
import { connection } from "next/server"
import { Logo } from "@/components/logo"
import { Skeleton } from "@/components/ui/skeleton"
import { JobStatusView } from "./components/job-status"
import { orderStatusView } from "./queries"

type Props = { params: Promise<{ publicId: string }>; searchParams: Promise<{ payment?: string }> }

/** /j/[publicId]: the customer watches their order, and can retry a payment that didn't go through. */
export function OrderStatusPage(props: Props) {
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
  const view = await orderStatusView(publicId)
  if (!view) notFound()

  return <JobStatusView initial={view} paymentResult={payment ?? null} />
}
