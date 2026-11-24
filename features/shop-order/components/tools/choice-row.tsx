"use client"

import { cn } from "@/lib/utils"
import { FIELD_LABEL } from "./tool-dialog"

/**
 * An iOS-style segmented control: mutually exclusive choices with a white thumb that slides to the selected
 * one. An option's `hint` (such as its price) shows as a second, smaller line.
 */
export function ChoiceRow<T extends string | number>({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string
  value: T
  options: { value: T; label: string; hint?: string; disabled?: boolean }[]
  onChange: (value: T) => void
  disabled?: boolean
}) {
  const index = options.findIndex((option) => option.value === value)
  const tall = options.some((option) => option.hint)

  return (
    <div className="flex flex-col gap-2">
      <span className={FIELD_LABEL}>{label}</span>
      <div role="radiogroup" aria-label={label} className="relative grid auto-cols-fr grid-flow-col rounded-xl bg-foreground/[0.06] p-0.5">
        {index >= 0 && (
          <span
            aria-hidden
            className="absolute inset-y-0.5 left-0.5 rounded-[10px] bg-background shadow-[0_3px_8px_rgba(0,0,0,0.12),0_1px_1px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.04] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] dark:bg-foreground/15"
            style={{ width: `calc((100% - 4px) / ${options.length})`, transform: `translateX(${index * 100}%)` }}
          />
        )}
        {options.map((option) => {
          const selected = option.value === value
          return (
            <button
              key={String(option.value)}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled || option.disabled}
              onClick={() => onChange(option.value)}
              className={cn(
                "relative z-10 flex flex-col items-center justify-center rounded-[10px] px-2 py-1.5 text-sm leading-tight transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-35",
                tall ? "min-h-13 gap-0.5" : "min-h-10",
                selected ? "font-semibold text-foreground" : "font-medium text-foreground/60 enabled:hover:text-foreground"
              )}
            >
              {option.label}
              {option.hint && <span className={cn("text-xs font-normal", selected ? "text-primary" : "text-muted-foreground")}>{option.hint}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
