"use client"

import { TagIcon } from "lucide-react"
import { IconTile } from "@/components/icon-tile"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldContent, FieldDescription, FieldLabel, FieldTitle } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { usePricingForm } from "../hooks/use-pricing-form"
import type { Pricing } from "../types"

const PAPER_ROWS = [
  { key: "A4", title: "A4" },
  { key: "Legal", title: "লিগ্যাল (Legal)" },
  { key: "A3", title: "A3" },
] as const

/** A large number input ending in "টাকা". */
function PriceInput({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (value: string) => void }) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="relative">
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          min={0}
          step="0.5"
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-12 [appearance:textfield] pr-16 text-lg font-semibold tabular-nums [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-muted-foreground">টাকা</span>
      </div>
    </Field>
  )
}

export function PricingForm({ initial }: { initial: Pricing }) {
  const { form, update, colorDuplex, setColorDuplex, submit, pending } = usePricingForm(initial)

  return (
    <Card>
      <form className="contents" onSubmit={submit}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <IconTile icon={TagIcon} tone="emerald" />
            <div>
              <CardTitle>প্রিন্টের দাম</CardTitle>
              <CardDescription>এক পাশে প্রিন্টের দাম প্রতি পৃষ্ঠা। দুই পাশে প্রিন্টের দাম প্রতি কাগজ (এক কাগজে ২ পৃষ্ঠা)।</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field orientation="horizontal" className="rounded-lg border p-4">
            <FieldContent>
              <FieldTitle>রঙিন প্রিন্ট দুই পাশে</FieldTitle>
              <FieldDescription>বন্ধ থাকলে রঙিন প্রিন্ট শুধু এক পাশে হবে।</FieldDescription>
            </FieldContent>
            <Switch checked={colorDuplex} onCheckedChange={setColorDuplex} aria-label="রঙিন প্রিন্ট দুই পাশে" />
          </Field>
          <div className="grid gap-4 xl:grid-cols-3">
            {PAPER_ROWS.map(({ key, title }) => {
              const row = form[key]
              const always = key === "A4"
              return (
                <div key={key} className={cn("flex flex-col gap-4 rounded-lg border p-4", !row.enabled && "bg-muted/40")}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-base font-semibold">{title}</span>
                    {/* A4 is always offered. */}
                    {!always && (
                      <Switch
                        checked={row.enabled}
                        onCheckedChange={(enabled) => update(key, { enabled })}
                        aria-label={`${title} চালু`}
                      />
                    )}
                  </div>
                  {row.enabled && (
                    <>
                      <div className="flex flex-col gap-3">
                        <span className="text-sm font-medium text-muted-foreground">এক পাশে (প্রতি পৃষ্ঠা)</span>
                        <div className="grid grid-cols-2 gap-4">
                          <PriceInput id={`${key}-bw`} label="সাদা-কালো" value={row.bw} onChange={(bw) => update(key, { bw })} />
                          <PriceInput id={`${key}-color`} label="রঙিন" value={row.color} onChange={(color) => update(key, { color })} />
                        </div>
                      </div>
                      <div className="flex flex-col gap-3">
                        <span className="text-sm font-medium text-muted-foreground">দুই পাশে (প্রতি কাগজ)</span>
                        <div className="grid grid-cols-2 gap-4">
                          <PriceInput
                            id={`${key}-bw-sheet`}
                            label="সাদা-কালো"
                            value={row.bwSheet}
                            onChange={(bwSheet) => update(key, { bwSheet })}
                          />
                          {colorDuplex && (
                            <PriceInput
                              id={`${key}-color-sheet`}
                              label="রঙিন"
                              value={row.colorSheet}
                              onChange={(colorSheet) => update(key, { colorSheet })}
                            />
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" disabled={pending}>
            {pending && <Spinner />} Save
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
