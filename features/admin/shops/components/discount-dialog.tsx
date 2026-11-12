"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldContent, FieldDescription, FieldLabel, FieldTitle } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Spinner } from "@/components/ui/spinner"
import { formatTaka } from "@/lib/constants"
import { useDiscountDialog } from "../hooks/use-discount-dialog"
import type { AdminShop } from "../types"

/** Sets or removes a shop's subscription discount. */
export function DiscountDialog({ shop, open, onClose }: { shop: AdminShop; open: boolean; onClose: () => void }) {
  const { kind, setKind, value, setValue, until, setUntil, note, setNote, preview, pending, submit, remove } = useDiscountDialog(shop, onClose)

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <form className="grid gap-4" onSubmit={submit}>
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
              <Button type="button" variant="ghost" className="text-destructive" disabled={pending} onClick={remove}>
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
