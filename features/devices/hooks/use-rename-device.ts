"use client"

import { useState } from "react"
import { useAction } from "@/components/use-action"
import { updateDevice } from "../actions"

/** "Rename printer" dialog: the name field and its submit; closes once saved. */
export function useRenameDevice(device: { id: string; name: string }) {
  const { pending, run } = useAction()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(device.name)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    run(() => updateDevice(device.id, { name }), { success: "নাম বদলানো হয়েছে", onSuccess: () => setOpen(false) })
  }

  return { open, setOpen, name, setName, submit, pending }
}
