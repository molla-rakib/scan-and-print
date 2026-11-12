"use client"

import { StoreIcon } from "lucide-react"
import { IconTile } from "@/components/icon-tile"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { useProfileForm } from "../hooks/use-profile-form"
import type { ProfileSettings } from "../types"

export function ProfileForm({ appUrl, initial }: { appUrl: string; initial: ProfileSettings }) {
  const { form, set, submit, pending } = useProfileForm(initial)

  return (
    <Card>
      <form className="contents" onSubmit={submit}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <IconTile icon={StoreIcon} tone="blue" />
            <div>
              <CardTitle>দোকানের তথ্য</CardTitle>
              <CardDescription>গ্রাহকরা অর্ডার পেজে এই নাম, ঠিকানা ও ফোন নম্বর দেখবেন।</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <FieldGroup className="grid gap-6 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="name">দোকানের নাম</FieldLabel>
              <Input id="name" required value={form.name} onChange={set("name")} />
            </Field>
            <Field>
              <FieldLabel htmlFor="slug">দোকানের লিংক</FieldLabel>
              <Input id="slug" required value={form.slug} onChange={set("slug")} />
              <FieldDescription className="break-all">
                {appUrl}/s/{form.slug}
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="address">ঠিকানা</FieldLabel>
              <Input id="address" value={form.address} onChange={set("address")} />
            </Field>
            <Field>
              <FieldLabel htmlFor="phone">ফোন নম্বর</FieldLabel>
              <Input id="phone" type="tel" value={form.phone} onChange={set("phone")} />
            </Field>
          </FieldGroup>
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
