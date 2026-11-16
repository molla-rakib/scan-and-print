"use client"

import { BanknoteIcon } from "lucide-react"
import { IconTile } from "@/components/icon-tile"
import { MasterSwitch } from "@/components/master-switch"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldContent, FieldGroup, FieldTitle } from "@/components/ui/field"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { SAVED } from "../content"
import { useCashForm } from "../hooks/use-cash-form"
import type { CashSettings } from "../types"

const FIELDS = [
  { key: "askName", title: "গ্রাহকের নাম" },
  { key: "askPhone", title: "মোবাইল নম্বর" },
] as const

export function CashForm({ initial }: { initial: CashSettings }) {
  const { cash, save, pending } = useCashForm(initial)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <IconTile icon={BanknoteIcon} tone="amber" />
          <div>
            <CardTitle>ক্যাশ পেমেন্ট</CardTitle>
            <CardDescription>গ্রাহক কাউন্টারে টাকা দেবেন, অর্ডার সাথে সাথে প্রিন্ট হবে।</CardDescription>
          </div>
        </div>
        <CardAction className="self-center">
          <MasterSwitch
            checked={cash.enabled}
            disabled={pending}
            onCheckedChange={(enabled) => save({ ...cash, enabled }, enabled ? "ক্যাশ পেমেন্ট চালু" : "ক্যাশ পেমেন্ট বন্ধ")}
            label="ক্যাশ পেমেন্ট"
          />
        </CardAction>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <div className={cn("flex flex-col gap-4 rounded-lg border bg-muted/40 p-4", !cash.enabled && "opacity-60")}>
            <p className="text-sm font-medium">গ্রাহকের কাছে যা চাওয়া হবে</p>
            {FIELDS.map(({ key, title }) => {
              const other = key === "askName" ? cash.askPhone : cash.askName
              return (
                <Field key={key} orientation="horizontal">
                  <FieldContent>
                    <FieldTitle>{title}</FieldTitle>
                  </FieldContent>
                  <Switch
                    checked={cash[key]}
                    // The last field that is on can't be switched off.
                    disabled={pending || !cash.enabled || (cash[key] && !other)}
                    onCheckedChange={(value) => save({ ...cash, [key]: value }, SAVED)}
                    aria-label={title}
                  />
                </Field>
              )
            })}
          </div>
        </FieldGroup>
      </CardContent>
    </Card>
  )
}
