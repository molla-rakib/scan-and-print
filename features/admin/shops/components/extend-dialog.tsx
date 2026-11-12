"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { useExtendDialog } from "../hooks/use-extend-dialog"
import type { AdminShop } from "../types"

/** Records a payment by hand and extends the shop's subscription by some days. */
export function ExtendDialog({ shop, open, onClose }: { shop: AdminShop; open: boolean; onClose: () => void }) {
  const { days, setDays, amount, setAmount, pending, submit } = useExtendDialog(shop, open, onClose)

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <form className="grid gap-4" onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>মেয়াদ বাড়ান</DialogTitle>
            <DialogDescription>{shop.name}</DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor={`value-${shop.id}`}>কত দিন</FieldLabel>
            <Input id={`value-${shop.id}`} type="number" min={1} required value={days} onChange={(e) => setDays(e.target.value)} />
            <FieldDescription>বর্তমান মেয়াদের শেষ থেকে যোগ হবে।</FieldDescription>
          </Field>
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
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>বাতিল</DialogClose>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner />} Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
