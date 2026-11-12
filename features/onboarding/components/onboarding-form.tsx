"use client"

import { DeviceStepper } from "@/components/device-stepper"
import { PlanPricing } from "@/components/plan-pricing"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { formatNumber } from "@/lib/constants"
import { useOnboardingForm } from "../hooks/use-onboarding-form"

const SUBMIT_LABEL = { idle: "দোকান তৈরি করুন", creating: "দোকান তৈরি হচ্ছে…", opening: "ড্যাশবোর্ড খোলা হচ্ছে…" }

export function OnboardingForm({
  deviceFee,
  trialDays,
  defaultDevices,
}: {
  deviceFee: number
  trialDays: number
  defaultDevices: number
}) {
  const { fields, setName, setSlug, setAddress, setPhone, setDevices, submit, status } = useOnboardingForm(defaultDevices)
  const busy = status !== "idle"

  return (
    <form onSubmit={submit} aria-busy={busy}>
      {/* A disabled fieldset locks every input while the shop is created and the dashboard opens. */}
      <fieldset disabled={busy} className="contents">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="name">দোকানের নাম</FieldLabel>
            <Input
              id="name"
              required
              autoFocus
              placeholder="যেমন: রহিম ফটোকপি অ্যান্ড প্রিন্ট"
              value={fields.name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="slug">দোকানের লিংক</FieldLabel>
            <Input id="slug" required value={fields.slug} onChange={(e) => setSlug(e.target.value)} />
            <FieldDescription>
              QR কোড স্ক্যান করলে গ্রাহক <span className="font-medium">/s/{fields.slug || "your-shop"}</span> পেজে যাবে। ইংরেজি ছোট হাতের অক্ষর, সংখ্যা ও ড্যাশ ব্যবহার করুন।
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="address">ঠিকানা</FieldLabel>
            <Input id="address" placeholder="ঐচ্ছিক" value={fields.address} onChange={(e) => setAddress(e.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="phone">ফোন নম্বর</FieldLabel>
            <Input id="phone" type="tel" placeholder="ঐচ্ছিক" value={fields.phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <FieldSet>
            <FieldLegend variant="label">কয়টি প্রিন্টার বা ফটোকপি মেশিন যুক্ত করবেন?</FieldLegend>
            <DeviceStepper value={fields.devices} onChange={setDevices} deviceFee={deviceFee} disabled={busy} />
            <div className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
              প্রথম {formatNumber(trialDays)} দিন সম্পূর্ণ ফ্রি। এরপর যে প্ল্যান নেবেন:
            </div>
            <PlanPricing deviceFee={deviceFee} devices={fields.devices} />
            <FieldDescription>ফ্রি ট্রায়াল শেষ হওয়ার আগে পেমেন্টের সময় ডিভাইসের সংখ্যা আবার বদলাতে পারবেন।</FieldDescription>
          </FieldSet>
          <Button type="submit" size="lg" disabled={busy}>
            {busy && <Spinner />} {SUBMIT_LABEL[status]}
          </Button>
        </FieldGroup>
      </fieldset>
    </form>
  )
}
