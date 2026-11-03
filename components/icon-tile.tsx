import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export type Tone = "blue" | "emerald" | "violet" | "amber" | "rose" | "sky"

export const toneStyles: Record<Tone, { tile: string; soft: string; glow: string }> = {
  blue: { tile: "bg-blue-600 text-white shadow-blue-600/30", soft: "bg-blue-500/10 text-blue-700 dark:text-blue-300", glow: "from-blue-500/12" },
  emerald: {
    tile: "bg-emerald-600 text-white shadow-emerald-600/30",
    soft: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    glow: "from-emerald-500/12",
  },
  violet: {
    tile: "bg-violet-600 text-white shadow-violet-600/30",
    soft: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
    glow: "from-violet-500/12",
  },
  amber: { tile: "bg-amber-500 text-white shadow-amber-500/30", soft: "bg-amber-500/15 text-amber-700 dark:text-amber-300", glow: "from-amber-500/15" },
  rose: { tile: "bg-rose-600 text-white shadow-rose-600/30", soft: "bg-rose-500/10 text-rose-700 dark:text-rose-300", glow: "from-rose-500/12" },
  sky: { tile: "bg-sky-500 text-white shadow-sky-500/30", soft: "bg-sky-500/10 text-sky-700 dark:text-sky-300", glow: "from-sky-500/12" },
}

/** A colored square with an icon, used to give cards and headers some color. */
export function IconTile({
  icon: Icon,
  tone = "blue",
  variant = "solid",
  className,
}: {
  icon: LucideIcon
  tone?: Tone
  variant?: "solid" | "soft"
  className?: string
}) {
  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-md",
        variant === "solid" ? cn("shadow-md", toneStyles[tone].tile) : toneStyles[tone].soft,
        className
      )}
    >
      <Icon className="size-[1.1rem]" />
    </span>
  )
}
