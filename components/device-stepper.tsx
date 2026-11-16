"use client"

import { MinusIcon, PlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MAX_BILLING_DEVICES, formatNumber, formatTaka } from "@/lib/constants"

/** − N + picker for a device count (1 to MAX_BILLING_DEVICES), with the per-device monthly price beside it. */
export function DeviceStepper({
  value,
  onChange,
  deviceFee,
  disabled,
}: {
  value: number
  onChange: (value: number) => void
  deviceFee: number
  disabled?: boolean
}) {
  return (
    <div className="flex items-center gap-3">
      <Button
        type="button"
        variant="outline"
        size="icon-lg"
        aria-label="ডিভাইস কমান"
        disabled={disabled || value <= 1}
        onClick={() => onChange(Math.max(1, value - 1))}
      >
        <MinusIcon />
      </Button>
      <span className="min-w-12 text-center text-2xl font-semibold tabular-nums" aria-live="polite">
        {formatNumber(value)}
      </span>
      <Button
        type="button"
        variant="outline"
        size="icon-lg"
        aria-label="ডিভাইস বাড়ান"
        disabled={disabled || value >= MAX_BILLING_DEVICES}
        onClick={() => onChange(Math.min(MAX_BILLING_DEVICES, value + 1))}
      >
        <PlusIcon />
      </Button>
      <span className="text-sm text-muted-foreground">
        × {formatTaka(deviceFee)} = <span className="font-semibold text-foreground tabular-nums">{formatTaka(deviceFee * value)}</span> / মাস
      </span>
    </div>
  )
}
