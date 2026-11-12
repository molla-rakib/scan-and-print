"use client"

import { useState } from "react"
import { useAction } from "@/components/use-action"
import { updateEpsBilling } from "../actions"
import { SAVED } from "../constants"

export type EpsInitial = {
  enabled: boolean
  sandbox: boolean
  merchantId: string
  storeId: string
  username: string
  hasPassword: boolean
  hasHashKey: boolean
}

/** EPS gateway settings. Secrets start blank (blank keeps the saved one) and clear again after Save. */
export function useEpsSetupForm(initial: EpsInitial) {
  const { pending, run } = useAction()
  const [enabled, setEnabled] = useState(initial.enabled)
  const [savedEnabled, setSavedEnabled] = useState(initial.enabled)
  const [sandbox, setSandbox] = useState(initial.sandbox)
  const [merchantId, setMerchantId] = useState(initial.merchantId)
  const [storeId, setStoreId] = useState(initial.storeId)
  const [username, setUsername] = useState(initial.username)
  const [password, setPassword] = useState("")
  const [hashKey, setHashKey] = useState("")

  function submit(event: React.FormEvent) {
    event.preventDefault()
    run(() => updateEpsBilling({ enabled, sandbox, merchantId, storeId, username, password, hashKey }), {
      success: enabled ? "EPS সংযোগ সফল হয়েছে" : SAVED,
      onSuccess: () => {
        setSavedEnabled(enabled)
        setPassword("")
        setHashKey("")
      },
    })
  }

  return {
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
    dirtySwitch: enabled !== savedEnabled,
  }
}
