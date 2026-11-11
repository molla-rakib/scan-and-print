"use client"

import { useState } from "react"
import { BanIcon, CalendarPlusIcon, CheckIcon, MonitorIcon, MoreHorizontalIcon, PercentIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Field, FieldContent, FieldDescription, FieldLabel, FieldTitle } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Spinner } from "@/components/ui/spinner"
import { useAction } from "@/components/use-action"
import { formatTaka } from "@/lib/constants"
import { extendSubscription, removeDiscount, setDeviceLimit, setDiscount, setShopStatus } from "./actions"

export type ShopDiscount = { kind: "percent" | "fixed"; value: number; until: string; note: string }

type Shop = {
  id: string
  name: string
  deviceLimit: number
  suspended: boolean
  /** Full monthly price and the price after the shop's discount. */
  baseFee: number
  monthlyFee: number
  discount: ShopDiscount | null
}

/** What `days` of service cost at the shop's (discounted) monthly fee, pro-rated by 30-day months. */
const suggestedAmount = (days: number, monthlyFee: number) => Math.round((monthlyFee * days) / 30)

export function ShopActions({ shop }: { shop: Shop }) {
  const { pending, run } = useAction()
  const [dialog, setDialog] = useState<"limit" | "extend" | "discount" | null>(null)
  const [value, setValue] = useState("")
  const [amount, setAmount] = useState("")

  function open(kind: "limit" | "extend") {
    setValue(kind === "limit" ? String(shop.deviceLimit) : "30")
    setAmount(String(suggestedAmount(30, shop.monthlyFee)))
    setDialog(kind)
  }

  function submit() {
    const number = Number(value)
    const close = { onSuccess: () => setDialog(null) }
    if (dialog === "limit") run(() => setDeviceLimit(shop.id, number), { success: "ডিভাইস লিমিট আপডেট হয়েছে", ...close })
    if (dialog === "extend") {
      run(() => extendSubscription(shop.id, number, Number(amount || 0)), { success: "পেমেন্ট রেকর্ড ও মেয়াদ বাড়ানো হয়েছে", ...close })
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="আরও অপশন" disabled={pending} />}>
          {pending ? <Spinner /> : <MoreHorizontalIcon />}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          <DropdownMenuItem onClick={() => open("extend")}>
            <CalendarPlusIcon /> মেয়াদ বাড়ান
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => open("limit")}>
            <MonitorIcon /> ডিভাইস লিমিট
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setDialog("discount")}>
            <PercentIcon /> ছাড়
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {shop.suspended ? (
            <DropdownMenuItem onClick={() => run(() => setShopStatus(shop.id, "active"), { success: "দোকান চালু করা হয়েছে" })}>
              <CheckIcon /> দোকান চালু করুন
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              variant="destructive"
              onClick={() => run(() => setShopStatus(shop.id, "suspended"), { success: "দোকান বন্ধ করা হয়েছে" })}
            >
              <BanIcon /> দোকান বন্ধ করুন
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <DiscountDialog shop={shop} open={dialog === "discount"} onClose={() => setDialog(null)} />

      <Dialog open={dialog === "limit" || dialog === "extend"} onOpenChange={(next) => !next && setDialog(null)}>
        <DialogContent>
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              submit()
            }}
          >
            <DialogHeader>
              <DialogTitle>{dialog === "limit" ? "ডিভাইস লিমিট" : "মেয়াদ বাড়ান"}</DialogTitle>
              <DialogDescription>{shop.name}</DialogDescription>
            </DialogHeader>
            <Field>
              <FieldLabel htmlFor={`value-${shop.id}`}>{dialog === "limit" ? "সর্বোচ্চ চালু ডিভাইস" : "কত দিন"}</FieldLabel>
              <Input
                id={`value-${shop.id}`}
                type="number"
                min={dialog === "limit" ? 0 : 1}
                required
                value={value}
                onChange={(e) => {
                  setValue(e.target.value)
                  if (dialog === "extend") setAmount(String(suggestedAmount(Number(e.target.value) || 0, shop.monthlyFee)))
                }}
              />
              {dialog === "extend" && <FieldDescription>বর্তমান মেয়াদের শেষ থেকে যোগ হবে।</FieldDescription>}
            </Field>
            {dialog === "extend" && (
              <Field>
                <FieldLabel htmlFor={`amount-${shop.id}`}>পাওয়া টাকা</FieldLabel>
                <Input
                  id={`amount-${shop.id}`}
                  type="number"
                  min={0}
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <FieldDescription>বিনা মূল্যে বাড়ালে ০ দিন — আয়ে যোগ হবে না।</FieldDescription>
              </Field>
            )}
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>বাতিল</DialogClose>
              <Button type="submit" disabled={pending}>
                {pending && <Spinner />} Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

/** Sets or removes a shop's subscription discount. */
function DiscountDialog({ shop, open, onClose }: { shop: Shop; open: boolean; onClose: () => void }) {
  const { pending, run } = useAction()
  const [kind, setKind] = useState<"percent" | "fixed">(shop.discount?.kind ?? "percent")
  const [value, setValue] = useState(shop.discount ? String(shop.discount.value) : "")
  const [until, setUntil] = useState(shop.discount?.until ?? "")
  const [note, setNote] = useState(shop.discount?.note ?? "")

  const number = Number(value) || 0
  const preview =
    kind === "percent" ? Math.round(shop.baseFee * (1 - Math.min(number, 100) / 100)) : Math.min(shop.baseFee, Math.round(number))

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            run(() => setDiscount(shop.id, { kind, value: number, until, note }), { success: "ছাড় সেট হয়েছে", onSuccess: onClose })
          }}
        >
          <DialogHeader>
            <DialogTitle>সাবস্ক্রিপশনে ছাড়</DialogTitle>
            <DialogDescription>
              {shop.name} · পুরো দাম {formatTaka(shop.baseFee)}/মাস
            </DialogDescription>
          </DialogHeader>

          <RadioGroup value={kind} onValueChange={(v) => setKind(v as "percent" | "fixed")} className="grid grid-cols-2 gap-3">
            {(
              [
                { value: "percent", title: "শতাংশ ছাড়", text: "যেমন ২০% কম" },
                { value: "fixed", title: "নির্দিষ্ট মাসিক ফি", text: "পুরো দোকানের জন্য" },
              ] as const
            ).map((option) => (
              <FieldLabel key={option.value} htmlFor={`discount-${option.value}-${shop.id}`}>
                <Field orientation="horizontal">
                  <FieldContent>
                    <FieldTitle>{option.title}</FieldTitle>
                    <FieldDescription>{option.text}</FieldDescription>
                  </FieldContent>
                  <RadioGroupItem value={option.value} id={`discount-${option.value}-${shop.id}`} />
                </Field>
              </FieldLabel>
            ))}
          </RadioGroup>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor={`discount-value-${shop.id}`}>{kind === "percent" ? "ছাড় (%)" : "মাসিক ফি (টাকা)"}</FieldLabel>
              <Input
                id={`discount-value-${shop.id}`}
                type="number"
                min={kind === "percent" ? 1 : 0}
                max={kind === "percent" ? 100 : shop.baseFee}
                required
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`discount-until-${shop.id}`}>শেষ তারিখ (ঐচ্ছিক)</FieldLabel>
              <Input id={`discount-until-${shop.id}`} type="date" value={until} onChange={(e) => setUntil(e.target.value)} />
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor={`discount-note-${shop.id}`}>নোট (ঐচ্ছিক, শুধু অ্যাডমিন দেখবেন)</FieldLabel>
            <Input id={`discount-note-${shop.id}`} maxLength={120} value={note} onChange={(e) => setNote(e.target.value)} placeholder="যেমন: পাইলট দোকান" />
          </Field>

          <p className="rounded-lg bg-muted px-4 py-3 text-sm">
            ছাড়ের পর মাসিক ফি: <span className="font-semibold">{formatTaka(preview)}</span>
            {!until && <span className="text-muted-foreground"> · শেষ তারিখ না দিলে সবসময় থাকবে</span>}
          </p>

          <DialogFooter className="sm:justify-between">
            {shop.discount ? (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive"
                disabled={pending}
                onClick={() => run(() => removeDiscount(shop.id), { success: "ছাড় তুলে নেওয়া হয়েছে", onSuccess: onClose })}
              >
                ছাড় তুলে নিন
              </Button>
            ) : (
              <span />
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <DialogClose render={<Button variant="outline" />}>বাতিল</DialogClose>
              <Button type="submit" disabled={pending}>
                {pending && <Spinner />} Save
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
