import { Suspense } from "react"
import { notFound } from "next/navigation"
import { connection } from "next/server"
import { Logo } from "@/components/logo"
import { Skeleton } from "@/components/ui/skeleton"
import { env } from "@/lib/env"
import { ReceiveView } from "./components/receive-view"
import { ScanView } from "./components/scan-view"
import { transferPageView } from "./queries"

type Props = { params: Promise<{ id: string }> }

/**
 * /t/[id]: opened by scanning the QR in the shop PC's counter window. A "scan" session shows the shop's scans
 * as they arrive, to download; a "receive" session sends the customer's files to the shop PC.
 */
export function TransferPage({ params }: Props) {
  return (
    <div className="flex min-h-svh flex-col bg-muted/40">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 p-4 pt-6">
        <Suspense fallback={<Skeleton className="h-[420px]" />}>
          <Transfer params={params} />
        </Suspense>
      </main>
      <footer className="flex justify-center py-6 text-xs text-muted-foreground">
        <Logo className="h-7" />
      </footer>
    </div>
  )
}

async function Transfer({ params }: Props) {
  const { id } = await params
  await connection()
  const view = await transferPageView(id)
  if (!view) notFound()
  return view.kind === "scan" ? (
    <ScanView initial={view} />
  ) : (
    <ReceiveView initial={view} maxUploadMb={Math.round(env.maxUploadBytes / 1024 / 1024)} />
  )
}
