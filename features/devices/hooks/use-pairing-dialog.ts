"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useAction } from "@/components/use-action"
import { createPairingCode, getPairingStatus, type PairingStatus } from "../actions"

/**
 * "Add a PC" dialog: makes a pairing code each time the dialog opens (or on "new code"), then polls every 2 s
 * while it is open until the PC has connected and reported its printers, or the code has expired.
 */
export function usePairingDialog() {
  const { pending, run } = useAction()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pairing, setPairing] = useState<{ code: string; agentId: string } | null>(null)
  const [status, setStatus] = useState<PairingStatus | null>(null)

  function generate() {
    setPairing(null)
    setStatus(null)
    run(createPairingCode, { onSuccess: (result) => setPairing({ code: result.code, agentId: result.agentId }) })
  }

  // While the dialog is open, watch for the PC to connect and report its printers.
  const done = status?.state === "expired" || (status?.state === "paired" && status.checkedIn)
  useEffect(() => {
    if (!open || !pairing || done) return
    let cancelled = false
    let previous: PairingStatus | null = null
    const id = setInterval(async () => {
      const result = await getPairingStatus(pairing.agentId).catch(() => null)
      if (cancelled || !result?.ok) return
      // Show the new PC (and later its printers) on the page behind the dialog.
      if (result.state === "paired" && (previous?.state !== "paired" || previous.printers !== result.printers)) router.refresh()
      previous = result
      setStatus(result)
    }, 2000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [open, pairing, done, router])

  function onOpenChange(next: boolean) {
    setOpen(next)
    if (next) generate()
  }

  function copyCode() {
    if (!pairing) return
    navigator.clipboard.writeText(pairing.code)
    toast.success("কোড কপি হয়েছে")
  }

  return {
    open,
    onOpenChange,
    pairing,
    status,
    generate,
    copyCode,
    pending,
  }
}
