"use client"

import { useAction } from "@/components/use-action"
import { updateDevice } from "../actions"

/** A printer row's type select (B/W, color, color with photo paper) and on/off switch; one pending state. */
export function useDeviceRow(deviceId: string) {
  const { pending, run } = useAction()

  function setType(type: "bw" | "color" | "photo") {
    run(() => updateDevice(deviceId, { color: type !== "bw", photo: type === "photo" }))
  }

  function setEnabled(enabled: boolean) {
    run(() => updateDevice(deviceId, { enabled }), { success: enabled ? "প্রিন্টার চালু হয়েছে" : "প্রিন্টার বন্ধ হয়েছে" })
  }

  return { pending, setType, setEnabled }
}
