"use client"

import { Fragment, useEffect, useState } from "react"
import Link from "next/link"
import {
  BanknoteIcon,
  CheckIcon,
  CircleAlertIcon,
  HourglassIcon,
  PrinterIcon,
  ReceiptTextIcon,
  WalletIcon,
  XCircleIcon,
} from "lucide-react"
import { toast } from "sonner"
import { BkashButton } from "@/components/bkash"
import { CashCheckout, type CashCustomer } from "@/components/cash-checkout"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
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
  { label: "অর্ডার নেওয়া হয়েছে", icon: ReceiptTextIcon },
  { label: "লাইনে আছে", icon: HourglassIcon },
  { label: "প্রিন্ট হচ্ছে", icon: PrinterIcon },
  { label: "সম্পন্ন", icon: CheckIcon },
]

/** Index of the step the order is on; every step before it is done. Completed orders are past the last step. */
function currentStep(status: JobStatus) {
  return status === "printing" ? 2 : status === "completed" ? steps.length : 1
}

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
      return job.queuePosition && job.queuePosition > 1
        ? {
            title: `লাইনে আপনার অবস্থান: ${formatNumber(job.queuePosition)}`,
            text: `আপনার আগে ${formatNumber(job.queuePosition - 1)}টি অর্ডার আছে। আপনার পালা এলেই প্রিন্ট শুরু হবে।`,
          }
        : { title: "আপনার অর্ডার লাইনে আছে", text: "আপনার আগে কেউ নেই — প্রিন্টার প্রস্তুত হলেই প্রিন্ট শুরু হবে।" }
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
          <ol className="flex items-start" aria-label="অর্ডারের ধাপ">
            {steps.map((step, i) => {
              const current = currentStep(job.status)
              const state = i < current ? "done" : i === current ? "current" : "next"
              const Icon = state === "done" ? CheckIcon : step.icon
              return (
                <Fragment key={step.label}>
                  <li
                    aria-current={state === "current" ? "step" : undefined}
                    className="flex w-16 shrink-0 flex-col items-center gap-1.5 text-center"
                  >
                    <span
                      className={cn(
                        "relative flex size-9 items-center justify-center rounded-full border-2 transition-colors",
                        state === "done" && "border-emerald-500 bg-emerald-500 text-white",
                        state === "current" && "border-primary bg-primary text-primary-foreground",
                        state === "next" && "border-muted bg-background text-muted-foreground"
                      )}
                    >
                      {state === "current" && <span className="absolute inset-0 animate-ping rounded-full bg-primary/30" />}
                      <Icon className="relative size-4" />
                    </span>
                    <span
                      className={cn(
                        "text-xs leading-tight",
                        state === "current" ? "font-semibold text-primary" : state === "done" ? "font-medium" : "text-muted-foreground"
                      )}
                    >
                      {step.label}
                    </span>
                  </li>
                  {i < steps.length - 1 && (
                    <span className={cn("mt-4 h-0.5 flex-1 rounded-full", i < current ? "bg-emerald-500" : "bg-muted")} />
                  )}
                </Fragment>
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
          <Button size="lg" className="h-12 w-full text-base" render={<Link href={`/s/${job.shop.slug}`} />} nativeButton={false}>
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

/** A large icon whose motion matches the stage: an hourglass while waiting, paper feeding while printing. */
function StatusIcon({ status }: { status: JobStatus }) {
  const base = "relative flex size-16 items-center justify-center rounded-full"
  switch (status) {
    case "completed":
      return (
        <span className={cn(base, "animate-pop bg-emerald-500 text-white shadow-lg shadow-emerald-500/30")}>
          <CheckIcon className="size-8" strokeWidth={3} />
        </span>
      )
    case "printing":
      return (
        <span className={cn(base, "bg-violet-500/15 text-violet-600")}>
          <span className="absolute inset-0 animate-ping rounded-full bg-violet-500/15" />
          <PrinterIcon className="relative size-8" />
          {/* A sheet coming out of the printer. */}
          <span className="absolute top-[58%] left-1/2 h-2.5 w-4 -translate-x-1/2 overflow-hidden">
            <span className="block h-full w-full animate-print-sheet rounded-[1px] border border-violet-600 bg-white" />
          </span>
        </span>
      )
    case "queued":
      return (
        <span className={cn(base, "bg-blue-500/15 text-blue-600")}>
          <HourglassIcon className="size-8 animate-hourglass" />
        </span>
      )
    case "pending_payment":
      return (
        <span className={cn(base, "bg-amber-500/15 text-amber-600")}>
          <WalletIcon className="size-8" />
        </span>
      )
    case "awaiting_approval":
      return (
        <span className={cn(base, "bg-amber-500/15 text-amber-600")}>
          <BanknoteIcon className="size-8" />
        </span>
      )
    case "failed":
      return (
        <span className={cn(base, "bg-destructive/10 text-destructive")}>
          <CircleAlertIcon className="size-8" />
        </span>
      )
    default:
      return (
        <span className={cn(base, "bg-muted text-muted-foreground")}>
          <XCircleIcon className="size-8" />
        </span>
      )
  }
}
