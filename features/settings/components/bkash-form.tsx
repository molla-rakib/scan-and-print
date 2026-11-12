"use client"

import { BkashLogo } from "@/components/bkash"
import { MasterSwitch } from "@/components/master-switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldContent, FieldGroup, FieldLabel, FieldTitle } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { useBkashForm } from "../hooks/use-bkash-form"
import type { BkashInitial } from "../types"

export function BkashForm({ appUrl, initial }: { appUrl: string; initial: BkashInitial }) {
  const { fields, setEnabled, setSandbox, setUsername, setAppKey, setPassword, setAppSecret, submit, pending } = useBkashForm(initial)

  return (
    <Card>
      <form className="contents" onSubmit={submit}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <BkashLogo className="h-10 shrink-0 rounded-md border border-[#E2136E]/25 px-2.5 [&_img]:h-6" />
            <div>
              <CardTitle>বিকাশ মার্চেন্ট</CardTitle>
              <CardDescription>গ্রাহকের টাকা সরাসরি আপনার বিকাশ মার্চেন্ট অ্যাকাউন্টে যাবে।</CardDescription>
            </div>
          </div>
          <CardAction className="self-center">
            <MasterSwitch checked={fields.enabled} onCheckedChange={setEnabled} label="বিকাশ পেমেন্ট" />
          </CardAction>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Alert>
              <AlertDescription>
                শুধু মার্চেন্ট নম্বর থাকলে হবে না। বিকাশ থেকে Tokenized Checkout-এর Username, Password, App Key ও App Secret নিতে হবে।
                বিকাশকে Callback URL হিসেবে দিন: <span className="font-medium break-all">{appUrl}/api/bkash/callback</span>
              </AlertDescription>
            </Alert>

            <Field orientation="horizontal">
              <FieldContent>
                <FieldTitle>টেস্ট মোড (Sandbox)</FieldTitle>
              </FieldContent>
              <Switch checked={fields.sandbox} onCheckedChange={setSandbox} aria-label="টেস্ট মোড" />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="bkash-username">Username</FieldLabel>
                <Input id="bkash-username" autoComplete="off" value={fields.username} onChange={(e) => setUsername(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="bkash-password">Password</FieldLabel>
                <Input
                  id="bkash-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder={initial.hasPassword ? "•••••••• (সংরক্ষিত)" : ""}
                  value={fields.password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="bkash-app-key">App Key</FieldLabel>
                <Input id="bkash-app-key" autoComplete="off" value={fields.appKey} onChange={(e) => setAppKey(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="bkash-app-secret">App Secret</FieldLabel>
                <Input
                  id="bkash-app-secret"
                  type="password"
                  autoComplete="new-password"
                  placeholder={initial.hasAppSecret ? "•••••••• (সংরক্ষিত)" : ""}
                  value={fields.appSecret}
                  onChange={(e) => setAppSecret(e.target.value)}
                />
              </Field>
            </div>
          </FieldGroup>
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" disabled={pending}>
            {pending && <Spinner />} Save ও যাচাই করুন
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
