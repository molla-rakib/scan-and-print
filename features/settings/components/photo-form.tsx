"use client"

import { SquareUserIcon, TriangleAlertIcon } from "lucide-react"
import { IconTile } from "@/components/icon-tile"
import { MasterSwitch } from "@/components/master-switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { usePhotoForm } from "../hooks/use-photo-form"
import type { PhotoSettings } from "../types"

/** Passport/stamp photo sheets that customers make on the shop page: on/off and price per A4 sheet. */
export function PhotoForm({ initial }: { initial: PhotoSettings }) {
  const { enabled, toggle, price, setPrice, submit, pending } = usePhotoForm(initial)

  return (
    <Card>
      <form className="contents" onSubmit={submit}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <IconTile icon={SquareUserIcon} tone="violet" />
            <div>
              <CardTitle>পাসপোর্ট ছবি</CardTitle>
              <CardDescription>গ্রাহক ফোনে নিজের ছবি সাইজ মতো কেটে এক পাতা ছবি অর্ডার করবেন, রঙিন প্রিন্টারে প্রিন্ট হবে।</CardDescription>
            </div>
          </div>
          <CardAction className="self-center">
            <MasterSwitch checked={enabled} disabled={pending} onCheckedChange={toggle} label="পাসপোর্ট ছবি" />
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {!initial.hasColorPrinter && (
            <Alert>
              <TriangleAlertIcon />
              <AlertDescription>কোনো রঙিন প্রিন্টার চালু নেই। ডিভাইস পেজে রঙিন বা ফটো প্রিন্টার চালু করলে গ্রাহক এটি দেখতে পাবেন।</AlertDescription>
            </Alert>
          )}
          <Field className="max-w-xs">
            <FieldLabel htmlFor="photo-price">এক পাতা ছবির দাম</FieldLabel>
            <div className="relative">
              <Input
                id="photo-price"
                type="number"
                inputMode="decimal"
                min={0}
                step="1"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="h-12 [appearance:textfield] pr-16 text-lg font-semibold tabular-nums [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-muted-foreground">টাকা</span>
            </div>
            <FieldDescription>A4 পাতায় ৪ থেকে ১৬টি ছবি। ডিভাইস পেজে কোনো প্রিন্টারকে &quot;ফটো প্রিন্টার&quot; করলে ছবি সেখানেই যাবে।</FieldDescription>
          </Field>
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
