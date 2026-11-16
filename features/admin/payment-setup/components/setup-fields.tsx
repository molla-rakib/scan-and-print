"use client"

import { Button } from "@/components/ui/button"
import { CardFooter } from "@/components/ui/card"
import { Field, FieldContent, FieldDescription, FieldTitle } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"

/** Footer of a setup card: tells the admin when the on/off switch only takes effect after Save. */
export function SetupFooter({ pending, dirtySwitch, label = "Save" }: { pending: boolean; dirtySwitch: boolean; label?: string }) {
  return (
    <CardFooter className="flex-wrap justify-end gap-3">
      {dirtySwitch && <span className="text-sm text-amber-700 dark:text-amber-400">Save করলে চালু/বন্ধ কার্যকর হবে</span>}
      <Button type="submit" disabled={pending}>
        {pending && <Spinner />} {label}
      </Button>
    </CardFooter>
  )
}

export function SandboxField({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <Field orientation="horizontal">
      <FieldContent>
        <FieldTitle>টেস্ট মোড (Sandbox)</FieldTitle>
        <FieldDescription>আসল টাকা নেওয়ার আগে এটি বন্ধ করুন।</FieldDescription>
      </FieldContent>
      <Switch checked={checked} onCheckedChange={onChange} aria-label="টেস্ট মোড" />
    </Field>
  )
}
