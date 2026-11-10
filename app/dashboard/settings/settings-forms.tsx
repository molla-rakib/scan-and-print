"use client"

import { useState } from "react"
import { BanknoteIcon, StoreIcon, TagIcon } from "lucide-react"
import { BkashLogo } from "@/components/bkash"
import { IconTile } from "@/components/icon-tile"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldTitle } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { useAction } from "@/components/use-action"
import { slugify } from "@/lib/slug"
import { cn } from "@/lib/utils"
import { updateBkash, updateCashSettings, updatePricing, updateShopProfile } from "../actions"

const SAVED = "Save হয়েছে"

// Inside the settings panel the cards are plain sections split by hairlines, without their own frame.
const SECTION = "gap-6 overflow-visible rounded-none bg-transparent py-0! ring-0 [--card-spacing:0px]"
const SECTION_FOOTER = "justify-end border-t-0 bg-transparent"

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
    <Card className={SECTION}>
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
            <CardTitle>দোকানের তথ্য</CardTitle>
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
        <CardFooter className={SECTION_FOOTER}>
          <Button type="submit" disabled={pending}>
            {pending && <Spinner />} Save
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

type Prices = { bw: number; color: number; bwSheet: number; colorSheet: number }
type PaperPrices = Prices & { enabled: boolean }
type Pricing = Prices & { colorDuplex: boolean; paperSizes: { Legal: PaperPrices; A3: PaperPrices } }

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
  const { pending, run } = useAction()
  // Inputs are kept as text so the fields can be cleared while typing.
  const toForm = (p: Prices & { enabled?: boolean }) => ({
    enabled: p.enabled ?? true,
    bw: String(p.bw),
    color: String(p.color),
    bwSheet: String(p.bwSheet),
    colorSheet: String(p.colorSheet),
  })
  const [form, setForm] = useState({
    A4: toForm(initial),
    Legal: toForm(initial.paperSizes.Legal),
    A3: toForm(initial.paperSizes.A3),
  })
  const [colorDuplex, setColorDuplex] = useState(initial.colorDuplex)
  const update = (key: keyof typeof form, patch: Partial<(typeof form)["A4"]>) => setForm({ ...form, [key]: { ...form[key], ...patch } })
  const toPrices = (p: (typeof form)["A4"]) => ({
    enabled: p.enabled,
    bw: Number(p.bw),
    color: Number(p.color),
    bwSheet: Number(p.bwSheet),
    colorSheet: Number(p.colorSheet),
  })

  return (
    <Card className={SECTION}>
      <form
        className="contents"
        onSubmit={(e) => {
          e.preventDefault()
          // eslint-disable-next-line @typescript-eslint/no-unused-vars -- A4 is always on
          const { enabled, ...a4 } = toPrices(form.A4)
          run(
            () => updatePricing({ ...a4, colorDuplex, paperSizes: { Legal: toPrices(form.Legal), A3: toPrices(form.A3) } }),
            { success: SAVED }
          )
        }}
      >
        <CardHeader>
          <div className="flex items-center gap-3">
            <IconTile icon={TagIcon} tone="emerald" />
            <CardTitle>প্রিন্টের দাম</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            এক পাশে প্রিন্টের দাম প্রতি পৃষ্ঠা। দুই পাশে প্রিন্টের দাম প্রতি কাগজ (এক কাগজে ২ পৃষ্ঠা)।
          </p>
          <Field orientation="horizontal" className="rounded-lg border p-4">
            <FieldContent>
              <FieldTitle>রঙিন প্রিন্ট দুই পাশে</FieldTitle>
              <FieldDescription>বন্ধ থাকলে রঙিন প্রিন্ট শুধু এক পাশে হবে।</FieldDescription>
            </FieldContent>
            <Switch checked={colorDuplex} onCheckedChange={setColorDuplex} aria-label="রঙিন প্রিন্ট দুই পাশে" />
          </Field>
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
                      <div className="grid gap-4 sm:grid-cols-2">
                        <PriceInput id={`${key}-bw`} label="সাদা-কালো" value={row.bw} onChange={(bw) => update(key, { bw })} />
                        <PriceInput id={`${key}-color`} label="রঙিন" value={row.color} onChange={(color) => update(key, { color })} />
                      </div>
                    </div>
                    <div className="flex flex-col gap-3">
                      <span className="text-sm font-medium text-muted-foreground">দুই পাশে (প্রতি কাগজ)</span>
                      <div className="grid gap-4 sm:grid-cols-2">
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
        </CardContent>
        <CardFooter className={SECTION_FOOTER}>
          <Button type="submit" disabled={pending}>
            {pending && <Spinner />} Save
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

type CashSettings = { enabled: boolean; askName: boolean; askPhone: boolean }

export function CashForm({ initial }: { initial: CashSettings }) {
  const { pending, run } = useAction()
  const [cash, setCash] = useState(initial)

  function save(next: CashSettings, success: string) {
    const previous = cash
    setCash(next)
    run(() => updateCashSettings(next), { success, onError: () => setCash(previous) })
  }

  const fields = [
    { key: "askName", title: "গ্রাহকের নাম" },
    { key: "askPhone", title: "মোবাইল নম্বর" },
  ] as const

  return (
    <Card className={SECTION}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <IconTile icon={BanknoteIcon} tone="amber" />
          <CardTitle>ক্যাশ পেমেন্ট</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field orientation="horizontal">
            <FieldContent>
              <FieldTitle>কাউন্টারে ক্যাশ নিন</FieldTitle>
            </FieldContent>
            <Switch
              checked={cash.enabled}
              disabled={pending}
              onCheckedChange={(enabled) =>
                save({ ...cash, enabled }, enabled ? "ক্যাশ পেমেন্ট চালু" : "ক্যাশ পেমেন্ট বন্ধ")
              }
              aria-label="ক্যাশ পেমেন্ট"
            />
          </Field>

          <div className={cn("flex flex-col gap-4 rounded-lg border bg-muted/40 p-4", !cash.enabled && "opacity-60")}>
            <p className="text-sm font-medium">গ্রাহকের কাছে যা চাওয়া হবে</p>
            {fields.map(({ key, title }) => {
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
    <Card className={SECTION}>
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
            <CardTitle>বিকাশ মার্চেন্ট</CardTitle>
          </div>
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
                <FieldTitle>বিকাশ পেমেন্ট চালু করুন</FieldTitle>
              </FieldContent>
              <Switch checked={enabled} onCheckedChange={setEnabled} aria-label="বিকাশ পেমেন্ট" />
            </Field>

            <Field orientation="horizontal">
              <FieldContent>
                <FieldTitle>টেস্ট মোড (Sandbox)</FieldTitle>
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
          </FieldGroup>
        </CardContent>
        <CardFooter className={SECTION_FOOTER}>
          <Button type="submit" disabled={pending}>
            {pending && <Spinner />} Save ও যাচাই করুন
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
