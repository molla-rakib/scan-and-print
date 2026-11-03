"use client"

import { useState } from "react"
import { BanIcon, CalendarPlusIcon, CheckIcon, MonitorIcon, MoreHorizontalIcon } from "lucide-react"
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
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { useAction } from "@/components/use-action"
import { extendSubscription, setDeviceLimit, setShopStatus } from "./actions"

type Shop = { id: string; name: string; deviceLimit: number; suspended: boolean }

export function ShopActions({ shop }: { shop: Shop }) {
  const { pending, run } = useAction()
  const [dialog, setDialog] = useState<"limit" | "extend" | null>(null)
  const [value, setValue] = useState("")

  function open(kind: "limit" | "extend") {
    setValue(kind === "limit" ? String(shop.deviceLimit) : "30")
    setDialog(kind)
  }

  function submit() {
    const number = Number(value)
    const close = { onSuccess: () => setDialog(null) }
    if (dialog === "limit") run(() => setDeviceLimit(shop.id, number), { success: "ডিভাইস লিমিট আপডেট হয়েছে", ...close })
    if (dialog === "extend") run(() => extendSubscription(shop.id, number), { success: "মেয়াদ বাড়ানো হয়েছে", ...close })
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

      <Dialog open={dialog !== null} onOpenChange={(next) => !next && setDialog(null)}>
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
                onChange={(e) => setValue(e.target.value)}
              />
              {dialog === "extend" && <FieldDescription>পেমেন্ট পাওয়ার পর মেয়াদ বাড়ান। বর্তমান মেয়াদের শেষ থেকে যোগ হবে।</FieldDescription>}
            </Field>
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
