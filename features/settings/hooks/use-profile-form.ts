"use client"

import { useState } from "react"
import { useAction } from "@/components/use-action"
import { slugify } from "@/lib/slug"
import { updateShopProfile } from "../actions"
import { SAVED } from "../content"
import type { ProfileSettings } from "../types"

/** Profile form state (the link is kept slugified while typing) and save. */
export function useProfileForm(initial: ProfileSettings) {
  const { pending, run } = useAction()
  const [form, setForm] = useState(initial)
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [key]: key === "slug" ? slugify(e.target.value) : e.target.value })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    run(() => updateShopProfile(form), { success: SAVED })
  }

  return { form, set, submit, pending }
}
