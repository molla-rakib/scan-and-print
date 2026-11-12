"use client"

import { useAction } from "@/components/use-action"
import { updateDevice } from "../actions"

/** A printer row's color select and on/off switch; both share one pending state. */
export function useDeviceRow(deviceId: string) {
  const { pending, run } = useAction()

  function setColor(color: boolean) {
    run(() => updateDevice(deviceId, { color }))
  }

  function setEnabled(enabled: boolean) {
    run(() => updateDevice(deviceId, { enabled }), { success: enabled ? "প্রিন্টার চালু হয়েছে" : "প্রিন্টার বন্ধ হয়েছে" })
  }

  return { pending, setColor, setEnabled }
}
