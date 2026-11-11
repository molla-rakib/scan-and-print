"use client"

import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

/**
 * The main on/off switch of a settings section, shown at the right of its title. Larger than the other
 * switches and labelled চালু/বন্ধ in green or grey so its state is clear at a glance.
 */
export function MasterSwitch({
  checked,
  onCheckedChange,
  disabled,
  label,
}: {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  /** What is being switched, for screen readers (e.g. "ক্যাশ পেমেন্ট"). */
  label: string
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-2.5 rounded-full border py-1 pr-1 pl-3.5 text-sm font-semibold transition-colors select-none",
        checked
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          : "border-border bg-muted text-muted-foreground",
        disabled && "cursor-not-allowed opacity-60"
      )}
    >
      {checked ? "চালু" : "বন্ধ"}
      <Switch
        size="lg"
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-label={label}
        className="data-checked:bg-emerald-600"
      />
    </label>
  )
}
