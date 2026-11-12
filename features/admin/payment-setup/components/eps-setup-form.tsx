"use client"

import { CreditCardIcon } from "lucide-react"
import { IconTile } from "@/components/icon-tile"
import { MasterSwitch } from "@/components/master-switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { SECRET_SAVED } from "../constants"
import { useEpsSetupForm, type EpsInitial } from "../hooks/use-eps-setup-form"
import { SandboxField, SetupFooter } from "./setup-fields"

/** The EPS payment gateway (cards, bKash, Nagad, Rocket): the subscription extends as soon as EPS confirms. */
export function EpsSetupForm({ appUrl, initial }: { appUrl: string; initial: EpsInitial }) {
  const {
    enabled,
    sandbox,
    merchantId,
    storeId,
    username,
    password,
    hashKey,
    setEnabled,
    setSandbox,
    setMerchantId,
    setStoreId,
    setUsername,
    setPassword,
    setHashKey,
    pending,
    submit,
    dirtySwitch,
  } = useEpsSetupForm(initial)

  return (
    <Card>
      <form className="contents" onSubmit={submit}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <IconTile icon={CreditCardIcon} tone="sky" />
            <div>
              <CardTitle>EPS পেমেন্ট গেটওয়ে</CardTitle>
              <CardDescription>কার্ড, বিকাশ, নগদ, রকেট — সাথে সাথে মেয়াদ বাড়বে।</CardDescription>
            </div>
          </div>
          <CardAction className="self-center">
            <MasterSwitch checked={enabled} onCheckedChange={setEnabled} label="EPS" />
          </CardAction>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Alert>
              <AlertDescription>
                EPS মার্চেন্ট প্যানেল থেকে Merchant ID, Store ID, Username, Password ও Hash Key নিন। আমাদের ডোমেইন{" "}
                <span className="font-medium break-all">{appUrl}</span> EPS-এ রেজিস্টার করা থাকতে হবে।
              </AlertDescription>
            </Alert>
            <SandboxField checked={sandbox} onChange={setSandbox} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="eps-merchant">Merchant ID</FieldLabel>
                <Input id="eps-merchant" autoComplete="off" value={merchantId} onChange={(e) => setMerchantId(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="eps-store">Store ID</FieldLabel>
                <Input id="eps-store" autoComplete="off" value={storeId} onChange={(e) => setStoreId(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="eps-username">Username</FieldLabel>
                <Input id="eps-username" autoComplete="off" value={username} onChange={(e) => setUsername(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="eps-password">Password</FieldLabel>
                <Input
                  id="eps-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder={initial.hasPassword ? SECRET_SAVED : ""}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>
              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="eps-hash">Hash Key</FieldLabel>
                <Input
                  id="eps-hash"
                  type="password"
                  autoComplete="new-password"
                  placeholder={initial.hasHashKey ? SECRET_SAVED : ""}
                  value={hashKey}
                  onChange={(e) => setHashKey(e.target.value)}
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
