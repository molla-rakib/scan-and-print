"use client"

import { useState } from "react"
import { useAction } from "@/components/use-action"
import { updateBkashBilling } from "../actions"
import { SAVED } from "../constants"

export type BkashInitial = { enabled: boolean; sandbox: boolean; username: string; appKey: string; hasPassword: boolean; hasAppSecret: boolean }

/** Our bKash merchant settings. Secrets start blank (blank keeps the saved one) and clear again after Save. */
export function useBkashSetupForm(initial: BkashInitial) {
  const { pending, run } = useAction()
  const [enabled, setEnabled] = useState(initial.enabled)
  const [savedEnabled, setSavedEnabled] = useState(initial.enabled)
  const [sandbox, setSandbox] = useState(initial.sandbox)
  const [username, setUsername] = useState(initial.username)
  const [appKey, setAppKey] = useState(initial.appKey)
  const [password, setPassword] = useState("")
  const [appSecret, setAppSecret] = useState("")

  function submit(event: React.FormEvent) {
    event.preventDefault()
    run(() => updateBkashBilling({ enabled, sandbox, username, appKey, password, appSecret }), {
      success: enabled ? "বিকাশ সংযোগ সফল হয়েছে" : SAVED,
      onSuccess: () => {
        setSavedEnabled(enabled)
        setPassword("")
        setAppSecret("")
      },
    })
  }

  return {
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
    dirtySwitch: enabled !== savedEnabled,
  }
}
