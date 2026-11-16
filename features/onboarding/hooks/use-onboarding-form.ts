"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { MAX_BILLING_DEVICES } from "@/lib/constants"
import { slugify } from "@/lib/slug"
import { createShop } from "../actions"

/**
 * Onboarding form state and submit. Creating the shop and opening the dashboard run in one transition, so
 * the form stays in its "creating" state until the dashboard is on screen (no dead moment in between).
 */
export function useOnboardingForm(defaultDevices: number) {
  const router = useRouter()
  const [name, setNameState] = useState("")
  const [slug, setSlugState] = useState("")
  const [slugEdited, setSlugEdited] = useState(false)
  const [address, setAddress] = useState("")
  const [phone, setPhone] = useState("")
  const [devices, setDevices] = useState(Math.min(Math.max(defaultDevices, 1), MAX_BILLING_DEVICES))
  const [created, setCreated] = useState(false)
  const [pending, startTransition] = useTransition()

  function setName(value: string) {
    setNameState(value)
    if (!slugEdited) setSlugState(slugify(value))
  }

  function setSlug(value: string) {
    setSlugEdited(true)
    setSlugState(slugify(value))
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    startTransition(async () => {
      try {
        const result = await createShop({ name, slug, address, phone, devices })
        if (!result.ok) return void toast.error(result.error)
        toast.success("দোকান তৈরি হয়েছে")
        setCreated(true)
        startTransition(() => router.replace("/dashboard"))
      } catch {
        toast.error("কিছু একটা সমস্যা হয়েছে। আবার চেষ্টা করুন।")
      }
    })
  }

  return {
    fields: { name, slug, address, phone, devices },
    setName,
    setSlug,
    setAddress,
    setPhone,
    setDevices,
    submit,
    /** "creating" while the shop is saved, then "opening" while the dashboard loads. */
    status: !pending ? ("idle" as const) : created ? ("opening" as const) : ("creating" as const),
  }
}
