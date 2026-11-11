"use client"

import { useState } from "react"
import { CopyIcon } from "lucide-react"
import { toast } from "sonner"
import { BkashLogo } from "@/components/bkash"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldSet, FieldLegend, FieldTitle } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Spinner } from "@/components/ui/spinner"
import { useAction } from "@/components/use-action"
import { BILLING_MONTHS, SUBSCRIPTION_METHOD_LABELS, formatNumber, formatTaka, type SubscriptionMethod } from "@/lib/constants"
import { startGatewayPayment, submitManualPayment } from "./actions"

type PayMethod = Exclude<SubscriptionMethod, "admin">

const METHOD_HINTS: Record<PayMethod, string> = {
  manual_bkash: "আমাদের বিকাশ নম্বরে Send Money করে TrxID দিন",
  manual_nagad: "আমাদের নগদ নম্বরে Send Money করে TrxID দিন",
  bkash: "বিকাশ পেজে গিয়ে পেমেন্ট করুন, সাথে সাথে চালু হবে",
  eps: "কার্ড, বিকাশ, নগদ, রকেট — সাথে সাথে চালু হবে",
}

export function PayForm({
  monthlyFee,
  methods,
  manual,
  hasPendingManual,
}: {
  monthlyFee: number
  methods: PayMethod[]
  manual: { bkashNumber: string; nagadNumber: string; instructions: string }
  hasPendingManual: boolean
}) {
  const { pending, run } = useAction()
  const [months, setMonths] = useState<number>(1)
  const [method, setMethod] = useState<PayMethod | null>(methods[0] ?? null)
  const [trxId, setTrxId] = useState("")
  const [sender, setSender] = useState("")
  const amount = monthlyFee * months
  const isManual = method === "manual_bkash" || method === "manual_nagad"
  const ourNumber = method === "manual_bkash" ? manual.bkashNumber : method === "manual_nagad" ? manual.nagadNumber : ""

  if (methods.length === 0) {
    return (
      <Alert>
        <AlertDescription>অনলাইনে পেমেন্ট এখনো চালু হয়নি। মেয়াদ বাড়াতে আমাদের সাথে যোগাযোগ করুন।</AlertDescription>
      </Alert>
    )
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!method) return
    if (isManual) {
      run(() => submitManualPayment({ method, months, trxId, senderNumber: sender }), {
        success: "পেমেন্টের তথ্য পাঠানো হয়েছে। যাচাই হলে মেয়াদ বেড়ে যাবে।",
        onSuccess: () => {
          setTrxId("")
          setSender("")
        },
      })
    } else {
      run(() => startGatewayPayment({ method, months }), { onSuccess: ({ url }) => window.location.assign(url) })
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <FieldSet>
        <FieldLegend variant="label">কত মাসের জন্য?</FieldLegend>
        <RadioGroup value={String(months)} onValueChange={(v) => setMonths(Number(v))} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {BILLING_MONTHS.map((m) => (
            <FieldLabel key={m} htmlFor={`months-${m}`}>
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldTitle>{formatNumber(m)} মাস</FieldTitle>
                  <FieldDescription>{formatTaka(monthlyFee * m)}</FieldDescription>
                </FieldContent>
                <RadioGroupItem value={String(m)} id={`months-${m}`} />
              </Field>
            </FieldLabel>
          ))}
        </RadioGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend variant="label">কীভাবে পেমেন্ট করবেন?</FieldLegend>
        <RadioGroup value={method ?? ""} onValueChange={(v) => setMethod(v as PayMethod)} className="grid gap-3 sm:grid-cols-2">
          {methods.map((m) => (
            <FieldLabel key={m} htmlFor={`method-${m}`}>
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldTitle className="flex items-center gap-2">
                    {(m === "bkash" || m === "manual_bkash") && <BkashLogo className="h-5 [&_img]:h-5" />}
                    {SUBSCRIPTION_METHOD_LABELS[m]}
                  </FieldTitle>
                  <FieldDescription>{METHOD_HINTS[m]}</FieldDescription>
                </FieldContent>
                <RadioGroupItem value={m} id={`method-${m}`} />
              </Field>
            </FieldLabel>
          ))}
        </RadioGroup>
      </FieldSet>

      {isManual &&
        (hasPendingManual ? (
          <Alert>
            <AlertDescription>আপনার আগের পেমেন্ট এখনো যাচাই হচ্ছে। যাচাই শেষ হলে আবার দিতে পারবেন।</AlertDescription>
          </Alert>
        ) : (
          <div className="flex flex-col gap-4 rounded-lg border bg-muted/40 p-4">
            <div className="flex flex-col gap-1 text-sm">
              <span>
                <span className="font-semibold">{formatTaka(amount)}</span> পাঠান এই নম্বরে (Send Money):
              </span>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(ourNumber).then(() => toast.success("নম্বর কপি হয়েছে"))}
                className="flex w-fit items-center gap-2 font-mono text-lg font-semibold tracking-wide"
              >
                {ourNumber}
                <CopyIcon className="size-4 text-muted-foreground" />
              </button>
              {manual.instructions && <p className="text-muted-foreground">{manual.instructions}</p>}
            </div>
            <FieldGroup className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="pay-trx">TrxID</FieldLabel>
                <Input id="pay-trx" required autoComplete="off" value={trxId} onChange={(e) => setTrxId(e.target.value)} placeholder="যেমন 9AB7CDEF12" />
              </Field>
              <Field>
                <FieldLabel htmlFor="pay-sender">যে নম্বর থেকে পাঠিয়েছেন</FieldLabel>
                <Input id="pay-sender" required inputMode="tel" value={sender} onChange={(e) => setSender(e.target.value)} placeholder="01XXXXXXXXX" />
              </Field>
            </FieldGroup>
          </div>
        ))}

      <div className="flex flex-col-reverse items-stretch gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          মোট <span className="text-lg font-semibold text-foreground">{formatTaka(amount)}</span>
        </div>
        <Button type="submit" size="lg" disabled={pending || !method || (isManual && hasPendingManual)}>
          {pending && <Spinner />}
          {isManual ? "পেমেন্টের তথ্য পাঠান" : `${formatTaka(amount)} পেমেন্ট করুন`}
        </Button>
      </div>
    </form>
  )
}
