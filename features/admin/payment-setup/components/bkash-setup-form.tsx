"use client"

import { BkashLogo } from "@/components/bkash"
import { MasterSwitch } from "@/components/master-switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { SECRET_SAVED } from "../constants"
import { useBkashSetupForm, type BkashInitial } from "../hooks/use-bkash-setup-form"
import { SandboxField, SetupFooter } from "./setup-fields"

/** Our bKash merchant (Tokenized Checkout): owners pay on bKash's page and the subscription extends at once. */
export function BkashSetupForm({ appUrl, initial }: { appUrl: string; initial: BkashInitial }) {
  const {
    enabled,
    sandbox,
    username,
    appKey,
    password,
    appSecret,
    setEnabled,
    setSandbox,
    setUsername,
    setAppKey,
    setPassword,
    setAppSecret,
    pending,
    submit,
    dirtySwitch,
  } = useBkashSetupForm(initial)

  return (
    <Card>
      <form className="contents" onSubmit={submit}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <BkashLogo className="h-10 shrink-0 rounded-md border border-[#E2136E]/25 px-2.5 [&_img]:h-6" />
            <div>
              <CardTitle>বিকাশ মার্চেন্ট</CardTitle>
              <CardDescription>বিকাশ পেজে পেমেন্ট, সাথে সাথে মেয়াদ বাড়বে।</CardDescription>
            </div>
          </div>
          <CardAction className="self-center">
            <MasterSwitch checked={enabled} onCheckedChange={setEnabled} label="বিকাশ মার্চেন্ট" />
          </CardAction>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Alert>
              <AlertDescription>
                বিকাশ থেকে Tokenized Checkout-এর Username, Password, App Key ও App Secret নিন। Callback URL:{" "}
                <span className="font-medium break-all">{appUrl}/api/billing/bkash/callback</span>
              </AlertDescription>
            </Alert>
            <SandboxField checked={sandbox} onChange={setSandbox} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="pb-username">Username</FieldLabel>
                <Input id="pb-username" autoComplete="off" value={username} onChange={(e) => setUsername(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="pb-password">Password</FieldLabel>
                <Input
                  id="pb-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder={initial.hasPassword ? SECRET_SAVED : ""}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="pb-app-key">App Key</FieldLabel>
                <Input id="pb-app-key" autoComplete="off" value={appKey} onChange={(e) => setAppKey(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="pb-app-secret">App Secret</FieldLabel>
                <Input
                  id="pb-app-secret"
                  type="password"
                  autoComplete="new-password"
                  placeholder={initial.hasAppSecret ? SECRET_SAVED : ""}
                  value={appSecret}
                  onChange={(e) => setAppSecret(e.target.value)}
                />
              </Field>
            </div>
          </FieldGroup>
        </CardContent>
        <SetupFooter pending={pending} dirtySwitch={dirtySwitch} label="Save ও যাচাই করুন" />
      </form>
    </Card>
  )
}
