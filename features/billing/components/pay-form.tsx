"use client"

import { CopyIcon } from "lucide-react"
import { toast } from "sonner"
import { BkashLogo } from "@/components/bkash"
import { DeviceStepper } from "@/components/device-stepper"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldLegend,
  FieldTitle,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Spinner } from "@/components/ui/spinner"
import {
  BILLING_MONTHS,
  BILLING_MONTH_DISCOUNTS,
  SUBSCRIPTION_METHOD_LABELS,
  billingAmount,
  formatNumber,
  formatTaka,
  type ShopDiscount,
} from "@/lib/constants"
import { usePayForm, type PayMethod } from "../hooks/use-pay-form"

const METHOD_HINTS: Record<PayMethod, string> = {
  manual_bkash: "আমাদের বিকাশ নম্বরে Send Money করে TrxID দিন",
  manual_nagad: "আমাদের নগদ নম্বরে Send Money করে TrxID দিন",
  bkash: "বিকাশ পেজে গিয়ে পেমেন্ট করুন, সাথে সাথে চালু হবে",
  eps: "কার্ড, বিকাশ, নগদ, রকেট — সাথে সাথে চালু হবে",
}

export function PayForm({
  deviceFee,
  discount,
  deviceLimit,
  enabledDevices,
  canChangeDevices,
  daysLeft,
  onTrial,
  methods,
  manual,
  hasPendingManual,
}: {
  /** Full price of one device per month. */
  deviceFee: number
  /** The shop's admin-given discount, if any. */
  discount: ShopDiscount | null
  deviceLimit: number
  enabledDevices: number
  /** Whether the device count may change with this payment (only when renewal is due). */
  canChangeDevices: boolean
  /** Whole days until the paid period (or trial) ends; 0 once it has ended. */
  daysLeft: number
  /** Still on the free trial (never paid). */
  onTrial: boolean
  methods: PayMethod[]
  manual: { bkashNumber: string; nagadNumber: string; instructions: string }
  hasPendingManual: boolean
}) {
  const {
    pending,
    months,
    setMonths,
    devices,
    setDevices,
    method,
    setMethod,
    trxId,
    setTrxId,
    sender,
    setSender,
    monthlyFee,
    amount,
    isManual,
    ourNumber,
    submit,
  } = usePayForm({ deviceFee, discount, deviceLimit, methods, manual })

  if (methods.length === 0) {
    return (
      <Alert>
        <AlertDescription>
          অনলাইনে পেমেন্ট এখনো চালু হয়নি। মেয়াদ বাড়াতে আমাদের সাথে যোগাযোগ
          করুন।
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      {canChangeDevices ? (
        <FieldSet>
          <FieldLegend variant="label">কয়টি ডিভাইস?</FieldLegend>
          <div className="flex flex-col gap-2">
            <DeviceStepper value={devices} onChange={setDevices} deviceFee={deviceFee} />
            {devices < enabledDevices && (
              <p className="text-sm text-amber-700 dark:text-amber-400">
                এখন {formatNumber(enabledDevices)}টি প্রিন্টার চালু আছে।
                পেমেন্টের পর অতিরিক্ত {formatNumber(enabledDevices - devices)}টি
                বন্ধ হয়ে যাবে।
              </p>
            )}
          </div>
        </FieldSet>
      ) : (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground tabular-nums">
            {formatNumber(daysLeft)}
          </span>
          <span className="font-semibold">
            {daysLeft === 0
              ? "মেয়াদ শেষ হয়ে গেছে"
              : onTrial
                ? `ফ্রি ট্রায়ালের আর ${formatNumber(daysLeft)} দিন বাকি`
                : `মেয়াদ শেষ হতে আর ${formatNumber(daysLeft)} দিন বাকি`}
          </span>
        </div>
      )}

      <FieldSet>
        <FieldLegend variant="label">কত মাসের জন্য?</FieldLegend>
        <RadioGroup
          value={String(months)}
          onValueChange={(v) => setMonths(Number(v))}
          className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          {BILLING_MONTHS.map((m) => (
            <FieldLabel key={m} htmlFor={`months-${m}`}>
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldTitle className="flex flex-wrap items-center gap-1.5">
                    {formatNumber(m)} মাস
                    {BILLING_MONTH_DISCOUNTS[m] > 0 && (
                      <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                        {formatNumber(BILLING_MONTH_DISCOUNTS[m])}% ছাড়
                      </span>
                    )}
                  </FieldTitle>
                  <FieldDescription className="flex flex-wrap gap-x-1.5">
                    {BILLING_MONTH_DISCOUNTS[m] > 0 && monthlyFee > 0 && (
                      <span className="line-through">
                        {formatTaka(monthlyFee * m)}
                      </span>
                    )}
                    <span>{formatTaka(billingAmount(monthlyFee, m))}</span>
                  </FieldDescription>
                </FieldContent>
                <RadioGroupItem value={String(m)} id={`months-${m}`} />
              </Field>
            </FieldLabel>
          ))}
        </RadioGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend variant="label">কীভাবে পেমেন্ট করবেন?</FieldLegend>
        <RadioGroup
          value={method ?? ""}
          onValueChange={(v) => setMethod(v as PayMethod)}
          className="grid gap-3 sm:grid-cols-2"
        >
          {methods.map((m) => (
            <FieldLabel key={m} htmlFor={`method-${m}`}>
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldTitle className="flex items-center gap-2">
                    {(m === "bkash" || m === "manual_bkash") && (
                      <BkashLogo className="h-5 [&_img]:h-5" />
                    )}
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
            <AlertDescription>
              আপনার আগের পেমেন্ট এখনো যাচাই হচ্ছে। যাচাই শেষ হলে আবার দিতে
              পারবেন।
            </AlertDescription>
          </Alert>
        ) : (
          <div className="flex flex-col gap-4 rounded-lg border bg-muted/40 p-4">
            <div className="flex flex-col gap-1 text-sm">
              <p className="text-xl">
                <span className="font-semibold text-blue-600">
                  {formatTaka(amount)}
                </span>{" "}
                পাঠান এই নম্বরে (Send Money):
              </p>
              <button
                type="button"
                onClick={() =>
                  navigator.clipboard
                    .writeText(ourNumber)
                    .then(() => toast.success("নম্বর কপি হয়েছে"))
                }
                className="flex w-fit items-center gap-2 font-mono text-lg font-semibold tracking-wide"
              >
                {ourNumber}
                <CopyIcon className="size-4 text-muted-foreground" />
              </button>
              {manual.instructions && (
                <p className="text-muted-foreground">{manual.instructions}</p>
              )}
            </div>
            <FieldGroup className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="pay-trx">TrxID</FieldLabel>
                <Input
                  id="pay-trx"
                  required
                  autoComplete="off"
                  value={trxId}
                  onChange={(e) => setTrxId(e.target.value)}
                  placeholder="যেমন 9AB7CDEF12"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="pay-sender">
                  যে নম্বর থেকে পাঠিয়েছেন
                </FieldLabel>
                <Input
                  id="pay-sender"
                  required
                  inputMode="tel"
                  value={sender}
                  onChange={(e) => setSender(e.target.value)}
                  placeholder="01XXXXXXXXX"
                />
              </Field>
            </FieldGroup>
          </div>
        ))}

      <div className="flex flex-col-reverse items-stretch gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          মোট{" "}
          <span className="text-lg font-semibold text-foreground">
            {formatTaka(amount)}
          </span>
        </div>
        <Button
          type="submit"
          size="lg"
          disabled={pending || !method || (isManual && hasPendingManual)}
        >
          {pending && <Spinner />}
          {isManual
            ? "পেমেন্টের তথ্য পাঠান"
            : `${formatTaka(amount)} পেমেন্ট করুন`}
        </Button>
      </div>
    </form>
  )
}
