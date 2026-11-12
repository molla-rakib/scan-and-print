"use client"

import { useState } from "react"
import { useAction } from "@/components/use-action"
import { removeAgent } from "../actions"

/** Confirm dialog for removing a paired PC; closes once it is removed. */
export function useRemoveAgent(agentId: string) {
  const { pending, run } = useAction()
  const [open, setOpen] = useState(false)

  function remove() {
    run(() => removeAgent(agentId), { success: "কম্পিউটার সরানো হয়েছে", onSuccess: () => setOpen(false) })
  }

  return { open, setOpen, remove, pending }
}
