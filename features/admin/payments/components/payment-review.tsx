"use client"

import { CheckIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { usePaymentReview } from "../hooks/use-payment-review"

/** Approve / reject buttons for one manual payment waiting for the admin. */
export function PaymentReview({ paymentId, label }: { paymentId: string; label: string }) {
  const { pending, rejecting, setRejecting, reason, setReason, approve, reject } = usePaymentReview(paymentId)

  return (
    <div className="flex gap-2">
      <Button size="sm" disabled={pending} onClick={approve}>
        {pending ? <Spinner /> : <CheckIcon />} Approve
      </Button>
      <Button size="sm" variant="outline" disabled={pending} onClick={() => setRejecting(true)}>
        <XIcon /> Reject
      </Button>

      <Dialog open={rejecting} onOpenChange={setRejecting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>পেমেন্ট প্রত্যাখ্যান</DialogTitle>
            <DialogDescription>{label}</DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor={`reason-${paymentId}`}>কারণ (দোকানদার দেখবেন)</FieldLabel>
            <Input id={`reason-${paymentId}`} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="টাকা পাওয়া যায়নি" />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(false)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={pending} onClick={reject}>
              {pending && <Spinner />} Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
