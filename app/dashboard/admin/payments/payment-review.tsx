"use client"

import { useState } from "react"
import { CheckIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { useAction } from "@/components/use-action"
import { approvePayment, rejectPayment } from "../actions"

/** Approve / reject buttons for one manual payment waiting for the admin. */
export function PaymentReview({ paymentId, label }: { paymentId: string; label: string }) {
  const { pending, run } = useAction()
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState("")

  return (
    <div className="flex gap-2">
      <Button size="sm" disabled={pending} onClick={() => run(() => approvePayment(paymentId), { success: "অনুমোদন হয়েছে, মেয়াদ বেড়েছে" })}>
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
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() =>
                run(() => rejectPayment(paymentId, reason), { success: "প্রত্যাখ্যান করা হয়েছে", onSuccess: () => setRejecting(false) })
              }
            >
              {pending && <Spinner />} Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
