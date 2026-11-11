"use client"

import { useState } from "react"
import { CreditCardIcon, HandCoinsIcon } from "lucide-react"
import { BkashLogo } from "@/components/bkash"
import { IconTile } from "@/components/icon-tile"
import { MasterSwitch } from "@/components/master-switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldTitle } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { useAction } from "@/components/use-action"
import { updateBkashBilling, updateEpsBilling, updateManualBilling } from "../actions"

const SAVED = "Save হয়েছে"
const SECRET_SAVED = "•••••••• (সংরক্ষিত)"

/** Footer of a setup card: tells the admin when the on/off switch only takes effect after Save. */
function SetupFooter({ pending, dirtySwitch, label = "Save" }: { pending: boolean; dirtySwitch: boolean; label?: string }) {
  return (
    <CardFooter className="flex-wrap justify-end gap-3">
      {dirtySwitch && <span className="text-sm text-amber-700 dark:text-amber-400">Save করলে চালু/বন্ধ কার্যকর হবে</span>}
      <Button type="submit" disabled={pending}>
        {pending && <Spinner />} {label}
      </Button>
    </CardFooter>
  )
}

function SandboxField({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
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

/* ------------------------------- Manual ------------------------------- */

type ManualInitial = { enabled: boolean; bkashNumber: string; nagadNumber: string; instructions: string }

export function ManualSetupForm({ initial }: { initial: ManualInitial }) {
  const { pending, run } = useAction()
  const [form, setForm] = useState(initial)
  const [savedEnabled, setSavedEnabled] = useState(initial.enabled)
  const set = (patch: Partial<ManualInitial>) => setForm((f) => ({ ...f, ...patch }))

  return (
    <Card>
      <form
        className="contents"
        onSubmit={(e) => {
          e.preventDefault()
          run(() => updateManualBilling(form), { success: SAVED, onSuccess: () => setSavedEnabled(form.enabled) })
        }}
      >
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
        <SetupFooter pending={pending} dirtySwitch={form.enabled !== savedEnabled} />
      </form>
    </Card>
  )
}

/* ------------------------------- bKash ------------------------------- */

type BkashInitial = { enabled: boolean; sandbox: boolean; username: string; appKey: string; hasPassword: boolean; hasAppSecret: boolean }

export function BkashSetupForm({ appUrl, initial }: { appUrl: string; initial: BkashInitial }) {
  const { pending, run } = useAction()
  const [enabled, setEnabled] = useState(initial.enabled)
  const [savedEnabled, setSavedEnabled] = useState(initial.enabled)
  const [sandbox, setSandbox] = useState(initial.sandbox)
  const [username, setUsername] = useState(initial.username)
  const [appKey, setAppKey] = useState(initial.appKey)
  const [password, setPassword] = useState("")
  const [appSecret, setAppSecret] = useState("")

  return (
    <Card>
      <form
        className="contents"
        onSubmit={(e) => {
          e.preventDefault()
          run(() => updateBkashBilling({ enabled, sandbox, username, appKey, password, appSecret }), {
            success: enabled ? "বিকাশ সংযোগ সফল হয়েছে" : SAVED,
            onSuccess: () => {
              setSavedEnabled(enabled)
              setPassword("")
              setAppSecret("")
            },
          })
        }}
      >
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
        <SetupFooter pending={pending} dirtySwitch={enabled !== savedEnabled} label="Save ও যাচাই করুন" />
      </form>
    </Card>
  )
}

/* -------------------------------- EPS -------------------------------- */

type EpsInitial = {
  enabled: boolean
  sandbox: boolean
  merchantId: string
  storeId: string
  username: string
  hasPassword: boolean
  hasHashKey: boolean
}

export function EpsSetupForm({ appUrl, initial }: { appUrl: string; initial: EpsInitial }) {
  const { pending, run } = useAction()
  const [enabled, setEnabled] = useState(initial.enabled)
  const [savedEnabled, setSavedEnabled] = useState(initial.enabled)
  const [sandbox, setSandbox] = useState(initial.sandbox)
  const [merchantId, setMerchantId] = useState(initial.merchantId)
  const [storeId, setStoreId] = useState(initial.storeId)
  const [username, setUsername] = useState(initial.username)
  const [password, setPassword] = useState("")
  const [hashKey, setHashKey] = useState("")

  return (
    <Card>
      <form
        className="contents"
        onSubmit={(e) => {
          e.preventDefault()
          run(() => updateEpsBilling({ enabled, sandbox, merchantId, storeId, username, password, hashKey }), {
            success: enabled ? "EPS সংযোগ সফল হয়েছে" : SAVED,
            onSuccess: () => {
              setSavedEnabled(enabled)
              setPassword("")
              setHashKey("")
            },
          })
        }}
      >
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
        <SetupFooter pending={pending} dirtySwitch={enabled !== savedEnabled} label="Save ও যাচাই করুন" />
      </form>
    </Card>
  )
}
