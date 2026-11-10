"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { BanknoteIcon, CheckIcon, CircleAlertIcon, PrinterIcon, XCircleIcon } from "lucide-react"
import { toast } from "sonner"
import { BkashButton } from "@/components/bkash"
import { CashCheckout, type CashCustomer } from "@/components/cash-checkout"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import {
  COLOR_MODE_LABELS,
  PAPER_SIZE_LABELS,
  PAYMENT_METHOD_LABELS,
  SIDES_LABELS,
  formatNumber,
  formatTaka,
  formatToken,
  type JobStatus,
  type PaymentMethod,
} from "@/lib/constants"
import { JobStatusBadge } from "@/components/job-status-badge"
import type { PublicOrderView } from "@/lib/public-shop"
import { cn } from "@/lib/utils"

const FINAL: JobStatus[] = ["completed", "cancelled"]

const steps = [
  { label: "অর্ডার", reached: ["queued", "printing", "completed"] },
  { label: "লাইনে", reached: ["queued", "printing", "completed"] },
  { label: "প্রিন্ট হচ্ছে", reached: ["printing", "completed"] },
  { label: "সম্পন্ন", reached: ["completed"] },
]

function headline(job: PublicOrderView): { title: string; text: string } {
  switch (job.status) {
    case "pending_payment":
      return { title: "পেমেন্ট সম্পন্ন হয়নি", text: "আবার চেষ্টা করুন অথবা অন্য পদ্ধতিতে পেমেন্ট করুন।" }
    case "awaiting_approval":
      return {
        title: `কাউন্টারে ${formatTaka(job.amount)} দিন`,
        text: `দোকানদারকে টোকেন ${formatToken(job.token)} দেখান। টাকা নেওয়ার পর প্রিন্ট শুরু হবে।`,
      }
    case "queued":
      return {
        title: job.queuePosition && job.queuePosition > 1 ? `লাইনে আপনার অবস্থান: ${formatNumber(job.queuePosition)}` : "প্রিন্ট শুরু হতে যাচ্ছে",
        text: "প্রিন্টার প্রস্তুত হলেই প্রিন্ট শুরু হবে।",
      }
    case "printing":
      return { title: "প্রিন্ট হচ্ছে…", text: job.files.length > 1 ? "সব ফাইল প্রিন্ট হলে জানানো হবে।" : "একটু অপেক্ষা করুন।" }
    case "completed":
      return { title: "প্রিন্ট সম্পন্ন!", text: `কাউন্টার থেকে টোকেন ${formatToken(job.token)} দেখিয়ে কাগজ সংগ্রহ করুন।` }
    case "failed":
      return { title: "প্রিন্টে সমস্যা হয়েছে", text: "চিন্তা করবেন না — দোকানদারকে টোকেন দেখান, তিনি আবার প্রিন্ট করে দেবেন।" }
    case "cancelled":
      return { title: "অর্ডার বাতিল হয়েছে", text: "প্রয়োজনে দোকানের সাথে যোগাযোগ করুন।" }
    default:
      return { title: "", text: "" }
  }
}

export function JobStatusView({ initial, paymentResult }: { initial: PublicOrderView; paymentResult: string | null }) {
  const [job, setJob] = useState(initial)
  const [paying, setPaying] = useState<PaymentMethod | null>(null)

  useEffect(() => {
    if (paymentResult === "cancelled") toast.error("পেমেন্ট বাতিল করা হয়েছে।")
    if (paymentResult === "failed") toast.error("পেমেন্ট সফল হয়নি।")
  }, [paymentResult])

  useEffect(() => {
    if (FINAL.includes(job.status)) return
    const id = setInterval(async () => {
      if (document.visibilityState !== "visible") return
      const response = await fetch(`/api/public/orders/${job.publicId}`, { cache: "no-store" }).catch(() => null)
      if (response?.ok) setJob(await response.json())
    }, 3000)
    return () => clearInterval(id)
  }, [job.publicId, job.status])

  async function retry(method: PaymentMethod, customer?: CashCustomer) {
    setPaying(method)
    // The print options were saved with the first attempt; only the payment is retried.
    const response = await fetch(`/api/public/orders/${job.publicId}/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method, customer }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      toast.error(data.error || "কিছু একটা সমস্যা হয়েছে।")
      return setPaying(null)
    }
    window.location.href = data.redirectUrl
  }

  const { title, text } = headline(job)
  const showSteps = !["pending_payment", "awaiting_approval", "cancelled", "failed"].includes(job.status)
  // Cash orders print without approval; remind the customer to pay at the counter.
  const cashDue = job.paymentMethod === "cash" && ["queued", "printing", "completed", "failed"].includes(job.status)

  return (
    <Card>
      <CardHeader className="items-center text-center">
        <CardDescription>{job.shop.name}</CardDescription>
        <div className="text-sm text-muted-foreground">আপনার টোকেন</div>
        <div className="text-6xl font-semibold tracking-tight tabular-nums">{formatToken(job.token)}</div>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <StatusIcon status={job.status} />
          <CardTitle className="text-xl">{title}</CardTitle>
          <p className="text-sm text-muted-foreground">{text}</p>
        </div>

        {showSteps && (
          <ol className="grid grid-cols-4 gap-2">
            {steps.map((step) => {
              const done = step.reached.includes(job.status)
              return (
                <li key={step.label} className="flex flex-col items-center gap-1.5 text-center">
                  <span className={cn("h-1.5 w-full rounded-full", done ? "bg-emerald-500" : "bg-muted")} />
                  <span className={cn("text-xs", done ? "font-medium" : "text-muted-foreground")}>{step.label}</span>
                </li>
              )
            })}
          </ol>
        )}

        {cashDue && (
          <Alert className="border-amber-500/40 bg-amber-500/10">
            <BanknoteIcon className="text-amber-600" />
            <AlertTitle>কাউন্টারে {formatTaka(job.amount)} ক্যাশ দিন</AlertTitle>
            <AlertDescription>দোকানদারকে টোকেন {formatToken(job.token)} দেখিয়ে টাকা দিন ও কাগজ নিন।</AlertDescription>
          </Alert>
        )}

        {job.files
          .filter((file) => file.status === "failed" && file.error)
          .map((file) => (
            <Alert key={file.id} variant="destructive">
              <CircleAlertIcon />
              <AlertTitle>প্রিন্টারের বার্তা{job.files.length > 1 && ` — ${file.fileName}`}</AlertTitle>
              <AlertDescription>{file.error}</AlertDescription>
            </Alert>
          ))}

        <Separator />

        <ul className="flex flex-col gap-3">
          {job.files.map((file) => (
            <li key={file.id} className="flex items-start justify-between gap-3 text-sm">
              <div className="min-w-0">
                <div className="truncate font-medium">{file.fileName}</div>
                <div className="text-xs text-muted-foreground">
                  {file.pagesLabel === "সব পৃষ্ঠা" ? `${formatNumber(file.pageCount)} পৃষ্ঠা` : `পৃষ্ঠা ${file.pagesLabel}`} ×{" "}
                  {formatNumber(file.copies)} কপি · {COLOR_MODE_LABELS[file.colorMode]}
                  {file.duplex && ` · ${SIDES_LABELS.both}`}
                  {file.paperSize !== "A4" && ` · ${PAPER_SIZE_LABELS[file.paperSize]}`}
                </div>
                {job.files.length > 1 && job.status !== "pending_payment" && (
                  <div className="mt-1">
                    <JobStatusBadge status={file.status} />
                  </div>
                )}
              </div>
              <span className="shrink-0 tabular-nums">{formatTaka(file.amount)}</span>
            </li>
          ))}
        </ul>

        <Separator />

        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-muted-foreground">মোট মূল্য</dt>
          <dd className="text-right font-semibold">{formatTaka(job.amount)}</dd>
          {job.paymentMethod && (
            <>
              <dt className="text-muted-foreground">পেমেন্ট</dt>
              <dd className="text-right">
                {PAYMENT_METHOD_LABELS[job.paymentMethod as PaymentMethod]}
                {job.trxId && <span className="block text-xs text-muted-foreground">TrxID: {job.trxId}</span>}
              </dd>
            </>
          )}
        </dl>
      </CardContent>

      <CardFooter className="flex-col gap-2">
        {job.status === "pending_payment" && (
          <>
            {job.shop.payments.bkash && (
              <BkashButton
                label="দিয়ে আবার পেমেন্ট করুন"
                pending={paying === "bkash"}
                disabled={!!paying}
                onClick={() => retry("bkash")}
              />
            )}
            {job.shop.payments.cash && (
              <CashCheckout
                fields={job.shop.cashFields}
                amount={job.amount}
                outline
                pending={paying === "cash"}
                disabled={!!paying}
                onSubmit={(customer) => retry("cash", customer)}
              />
            )}
          </>
        )}
        {FINAL.includes(job.status) && (
          <Button variant="outline" className="w-full" render={<Link href={`/s/${job.shop.slug}`} />} nativeButton={false}>
            আরেকটি ফাইল প্রিন্ট করুন
          </Button>
        )}
        {!FINAL.includes(job.status) && (
          <p className="text-center text-xs text-muted-foreground">এই পেজটি খোলা রাখুন — অবস্থা স্বয়ংক্রিয়ভাবে আপডেট হবে।</p>
        )}
      </CardFooter>
    </Card>
  )
}

function StatusIcon({ status }: { status: JobStatus }) {
  const base = "flex size-12 items-center justify-center rounded-full"
  switch (status) {
    case "completed":
      return (
        <span className={cn(base, "bg-emerald-500/15 text-emerald-600")}>
          <CheckIcon className="size-6" />
        </span>
      )
    case "failed":
    case "cancelled":
    case "pending_payment":
      return (
        <span className={cn(base, "bg-destructive/10 text-destructive")}>
          <XCircleIcon className="size-6" />
        </span>
      )
    case "awaiting_approval":
      return (
        <span className={cn(base, "bg-amber-500/15 text-amber-600")}>
          <BanknoteIcon className="size-6" />
        </span>
      )
    case "printing":
      return (
        <span className={cn(base, "animate-pulse bg-violet-500/15 text-violet-600")}>
          <PrinterIcon className="size-6" />
        </span>
      )
    default:
      return (
        <span className={cn(base, "bg-blue-500/15 text-blue-600")}>
          <Spinner className="size-6" />
        </span>
      )
  }
}
