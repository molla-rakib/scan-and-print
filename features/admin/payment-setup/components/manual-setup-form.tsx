"use client"

import { HandCoinsIcon } from "lucide-react"
import { IconTile } from "@/components/icon-tile"
import { MasterSwitch } from "@/components/master-switch"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useManualSetupForm, type ManualInitial } from "../hooks/use-manual-setup-form"
import { SetupFooter } from "./setup-fields"

/** Manual bKash / Nagad Send Money: our numbers and a note for the owner; the admin approves each payment. */
export function ManualSetupForm({ initial }: { initial: ManualInitial }) {
  const { form, set, pending, submit, dirtySwitch } = useManualSetupForm(initial)

  return (
    <Card>
      <form className="contents" onSubmit={submit}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <IconTile icon={HandCoinsIcon} tone="amber" />
            <div>
              <CardTitle>বিকাশ / নগদ (Send Money)</CardTitle>
              <CardDescription>দোকানদার আমাদের নম্বরে টাকা পাঠিয়ে TrxID দেবেন, আপনি যাচাই করে Approve করবেন।</CardDescription>
            </div>
          </div>
          <CardAction className="self-center">
            <MasterSwitch checked={form.enabled} onCheckedChange={(enabled) => set({ enabled })} label="ম্যানুয়াল পেমেন্ট" />
          </CardAction>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="manual-bkash">বিকাশ নম্বর</FieldLabel>
                <Input id="manual-bkash" inputMode="tel" value={form.bkashNumber} onChange={(e) => set({ bkashNumber: e.target.value })} placeholder="01XXXXXXXXX" />
                <FieldDescription>খালি রাখলে বিকাশ দেখানো হবে না।</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="manual-nagad">নগদ (Nagad) নম্বর</FieldLabel>
                <Input id="manual-nagad" inputMode="tel" value={form.nagadNumber} onChange={(e) => set({ nagadNumber: e.target.value })} placeholder="01XXXXXXXXX" />
                <FieldDescription>খালি রাখলে নগদ দেখানো হবে না।</FieldDescription>
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="manual-instructions">দোকানদারের জন্য নির্দেশনা (ঐচ্ছিক)</FieldLabel>
              <Input
                id="manual-instructions"
                maxLength={300}
                value={form.instructions}
                onChange={(e) => set({ instructions: e.target.value })}
                placeholder="যেমন: Payment নয়, Send Money করুন। Reference-এ দোকানের নাম লিখুন।"
              />
            </Field>
          </FieldGroup>
        </CardContent>
        <SetupFooter pending={pending} dirtySwitch={dirtySwitch} />
      </form>
    </Card>
  )
}
