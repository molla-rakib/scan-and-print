"use client"

import { cn } from "@/lib/utils"

/** A compact row of mutually exclusive choices for the tools. */
export function ChoiceRow<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string; disabled?: boolean }[]
  onChange: (value: T) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">{label}</span>
      <div role="radiogroup" aria-label={label} className="grid auto-cols-fr grid-flow-col gap-1.5 rounded-xl bg-muted p-1.5">
        {options.map((option) => (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={option.value === value}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "min-h-10 rounded-lg px-2 py-1.5 text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-45",
              option.value === value ? "bg-primary font-semibold text-primary-foreground shadow-sm" : "font-medium hover:bg-background/70"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
