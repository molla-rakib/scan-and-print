"use client"

import { useState } from "react"
import { useAction } from "@/components/use-action"
import { updateBkash } from "../actions"
import { SAVED } from "../content"
import type { BkashInitial } from "../types"

/** bKash merchant form state and save; the secrets are cleared from the form once saved. */
export function useBkashForm(initial: BkashInitial) {
  const { pending, run } = useAction()
  const [enabled, setEnabled] = useState(initial.enabled)
  const [sandbox, setSandbox] = useState(initial.sandbox)
  const [username, setUsername] = useState(initial.username)
  const [appKey, setAppKey] = useState(initial.appKey)
  const [password, setPassword] = useState("")
  const [appSecret, setAppSecret] = useState("")

  function submit(e: React.FormEvent) {
    e.preventDefault()
    run(() => updateBkash({ enabled, sandbox, username, appKey, password, appSecret }), {
      success: enabled ? "বিকাশ সংযোগ সফল হয়েছে" : SAVED,
      onSuccess: () => {
        setPassword("")
        setAppSecret("")
      },
    })
  }

  return {
    fields: { enabled, sandbox, username, appKey, password, appSecret },
    setEnabled,
    setSandbox,
    setUsername,
    setAppKey,
    setPassword,
    setAppSecret,
    submit,
    pending,
  }
}
