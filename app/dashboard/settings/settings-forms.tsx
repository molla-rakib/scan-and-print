"use client"

import { useState } from "react"
import { BanknoteIcon, StoreIcon, TagIcon } from "lucide-react"
import { BkashLogo } from "@/components/bkash"
import { IconTile } from "@/components/icon-tile"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldTitle } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { useAction } from "@/components/use-action"
import { slugify } from "@/lib/slug"
import { updateBkash, updateCashMode, updatePricing, updateShopProfile } from "../actions"

const SAVED = "Save হয়েছে"

export function ProfileForm({
  appUrl,
  initial,
}: {
  appUrl: string
  initial: { name: string; slug: string; address: string; phone: string }
}) {
  const { pending, run } = useAction()
  const [form, setForm] = useState(initial)
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [key]: key === "slug" ? slugify(e.target.value) : e.target.value })

  return (
    <Card>
      <form
        className="contents"
        onSubmit={(e) => {
          e.preventDefault()
          run(() => updateShopProfile(form), { success: SAVED })
        }}
      >
        <CardHeader>
          <div className="flex items-center gap-3">
            <IconTile icon={StoreIcon} tone="blue" />
            <div>
              <CardTitle>দোকানের তথ্য</CardTitle>
              <CardDescription>গ্রাহক এই তথ্য দেখতে পাবে।</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">দোকানের নাম</FieldLabel>
              <Input id="name" required value={form.name} onChange={set("name")} />
            </Field>
            <Field>
              <FieldLabel htmlFor="slug">দোকানের লিংক</FieldLabel>
              <Input id="slug" required value={form.slug} onChange={set("slug")} />
              <FieldDescription>
                {appUrl}/s/{form.slug} — লিংক বদলালে নতুন QR কোড প্রিন্ট করতে হবে।
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
        <CardFooter className="justify-end border-t pt-4">
          <Button type="submit" disabled={pending}>
            {pending && <Spinner />} Save
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

export function PricingForm({ initial }: { initial: { bw: number; color: number } }) {
  const { pending, run } = useAction()
  const [bw, setBw] = useState(String(initial.bw))
  const [color, setColor] = useState(String(initial.color))

  return (
    <Card>
      <form
        className="contents"
        onSubmit={(e) => {
          e.preventDefault()
          run(() => updatePricing({ bw: Number(bw), color: Number(color) }), { success: SAVED })
        }}
      >
        <CardHeader>
          <div className="flex items-center gap-3">
            <IconTile icon={TagIcon} tone="emerald" />
            <div>
              <CardTitle>প্রিন্টের দাম</CardTitle>
              <CardDescription>প্রতি পৃষ্ঠার দাম (টাকা)। মোট = পৃষ্ঠা × কপি × দাম।</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <FieldGroup className="grid grid-cols-1 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="bw">সাদা-কালো (৳)</FieldLabel>
              <Input id="bw" type="number" min={0} step="0.5" required value={bw} onChange={(e) => setBw(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="color">রঙিন (৳)</FieldLabel>
              <Input
                id="color"
                type="number"
                min={0}
                step="0.5"
                required
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
            </Field>
          </FieldGroup>
        </CardContent>
        <CardFooter className="justify-end border-t pt-4">
          <Button type="submit" disabled={pending}>
            {pending && <Spinner />} Save
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

export function CashForm({ enabled }: { enabled: boolean }) {
  const { pending, run } = useAction()
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
            <IconTile icon={BanknoteIcon} tone="amber" />
            <div>
              <CardTitle>ক্যাশ পেমেন্ট</CardTitle>
            </div>
          </div>
      </CardHeader>
      <CardContent>
        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>কাউন্টারে ক্যাশ নিন</FieldTitle>
            <FieldDescription>
              গ্রাহক &quot;ক্যাশ&quot; বেছে নিলে নাম ও মোবাইল নম্বর দিয়ে অর্ডার দেবে, অর্ডারটি সাথে সাথে প্রিন্ট হবে।
              কাউন্টারে টোকেন মিলিয়ে টাকা নিন। নতুন ক্যাশ অর্ডারে ড্যাশবোর্ডে শব্দ হবে।
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={enabled}
            disabled={pending}
            onCheckedChange={(value) => run(() => updateCashMode(value), { success: value ? "ক্যাশ পেমেন্ট চালু" : "ক্যাশ পেমেন্ট বন্ধ" })}
            aria-label="ক্যাশ পেমেন্ট"
          />
        </Field>
      </CardContent>
    </Card>
  )
}

type BkashInitial = {
  enabled: boolean
  sandbox: boolean
  username: string
  appKey: string
  hasPassword: boolean
  hasAppSecret: boolean
}

export function BkashForm({ appUrl, initial }: { appUrl: string; initial: BkashInitial }) {
  const { pending, run } = useAction()
  const [enabled, setEnabled] = useState(initial.enabled)
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
          run(() => updateBkash({ enabled, sandbox, username, appKey, password, appSecret }), {
            success: enabled ? "বিকাশ সংযোগ সফল হয়েছে" : SAVED,
            onSuccess: () => {
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
              <CardDescription>গ্রাহকের পেমেন্ট সরাসরি আপনার বিকাশ মার্চেন্ট অ্যাকাউন্টে জমা হবে।</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Alert>
              <AlertTitle>বিকাশ পেমেন্ট গেটওয়ে (PGW) অ্যাক্সেস প্রয়োজন</AlertTitle>
              <AlertDescription>
                শুধু মার্চেন্ট নম্বর থাকলে হবে না। বিকাশ থেকে Tokenized Checkout-এর Username, Password, App Key ও App Secret নিতে হবে।
                বিকাশকে Callback URL হিসেবে দিন: <span className="font-medium break-all">{appUrl}/api/bkash/callback</span>
              </AlertDescription>
            </Alert>

            <Field orientation="horizontal">
              <FieldContent>
                <FieldTitle>বিকাশ পেমেন্ট চালু করুন</FieldTitle>
                <FieldDescription>Save করার সময় ক্রেডেনশিয়াল যাচাই করা হবে।</FieldDescription>
              </FieldContent>
              <Switch checked={enabled} onCheckedChange={setEnabled} aria-label="বিকাশ পেমেন্ট" />
            </Field>

            <Field orientation="horizontal">
              <FieldContent>
                <FieldTitle>টেস্ট মোড (Sandbox)</FieldTitle>
                <FieldDescription>বিকাশের টেস্ট ক্রেডেনশিয়াল দিয়ে পরীক্ষা করার জন্য। আসল পেমেন্ট নিতে বন্ধ করুন।</FieldDescription>
              </FieldContent>
              <Switch checked={sandbox} onCheckedChange={setSandbox} aria-label="টেস্ট মোড" />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="bkash-username">Username</FieldLabel>
                <Input id="bkash-username" autoComplete="off" value={username} onChange={(e) => setUsername(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="bkash-password">Password</FieldLabel>
                <Input
                  id="bkash-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder={initial.hasPassword ? "•••••••• (সংরক্ষিত)" : ""}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="bkash-app-key">App Key</FieldLabel>
                <Input id="bkash-app-key" autoComplete="off" value={appKey} onChange={(e) => setAppKey(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="bkash-app-secret">App Secret</FieldLabel>
                <Input
                  id="bkash-app-secret"
                  type="password"
                  autoComplete="new-password"
                  placeholder={initial.hasAppSecret ? "•••••••• (সংরক্ষিত)" : ""}
                  value={appSecret}
                  onChange={(e) => setAppSecret(e.target.value)}
                />
              </Field>
            </div>
            <FieldDescription>Password ও App Secret ফাঁকা রাখলে আগের সংরক্ষিত মান থাকবে। সব তথ্য এনক্রিপ্ট করে রাখা হয়।</FieldDescription>
          </FieldGroup>
        </CardContent>
        <CardFooter className="justify-end border-t pt-4">
          <Button type="submit" disabled={pending}>
            {pending && <Spinner />} Save ও যাচাই করুন
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
