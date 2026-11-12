"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { useDeviceLimitDialog } from "../hooks/use-device-limit-dialog"
import type { AdminShop } from "../types"

/** Changes how many devices the shop may have switched on. */
export function DeviceLimitDialog({ shop, open, onClose }: { shop: AdminShop; open: boolean; onClose: () => void }) {
  const { limit, setLimit, pending, submit } = useDeviceLimitDialog(shop, open, onClose)

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <form className="grid gap-4" onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>ডিভাইস লিমিট</DialogTitle>
            <DialogDescription>{shop.name}</DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor={`value-${shop.id}`}>সর্বোচ্চ চালু ডিভাইস</FieldLabel>
            <Input id={`value-${shop.id}`} type="number" min={0} required value={limit} onChange={(e) => setLimit(e.target.value)} />
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
