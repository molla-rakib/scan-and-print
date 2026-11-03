"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { useAction } from "@/components/use-action"
import { createShop } from "@/app/dashboard/actions"
import { slugify } from "@/lib/slug"

export function OnboardingForm() {
  const router = useRouter()
  const { pending, run } = useAction()
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [slugEdited, setSlugEdited] = useState(false)
  const [address, setAddress] = useState("")
  const [phone, setPhone] = useState("")

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        run(() => createShop({ name, slug, address, phone }), {
          success: "দোকান তৈরি হয়েছে",
          onSuccess: () => router.replace("/dashboard"),
        })
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="name">দোকানের নাম</FieldLabel>
          <Input
            id="name"
            required
            autoFocus
            placeholder="যেমন: রহিম ফটোকপি অ্যান্ড প্রিন্ট"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              if (!slugEdited) setSlug(slugify(e.target.value))
            }}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="slug">দোকানের লিংক</FieldLabel>
          <Input
            id="slug"
            required
            value={slug}
            onChange={(e) => {
              setSlugEdited(true)
              setSlug(slugify(e.target.value))
            }}
          />
          <FieldDescription>
            QR কোড স্ক্যান করলে গ্রাহক <span className="font-medium">/s/{slug || "your-shop"}</span> পেজে যাবে। ইংরেজি ছোট হাতের অক্ষর, সংখ্যা ও ড্যাশ ব্যবহার করুন।
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="address">ঠিকানা</FieldLabel>
          <Input id="address" placeholder="ঐচ্ছিক" value={address} onChange={(e) => setAddress(e.target.value)} />
        </Field>
        <Field>
          <FieldLabel htmlFor="phone">ফোন নম্বর</FieldLabel>
          <Input id="phone" type="tel" placeholder="ঐচ্ছিক" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Button type="submit" size="lg" disabled={pending}>
          {pending && <Spinner />} দোকান তৈরি করুন
        </Button>
      </FieldGroup>
    </form>
  )
}
