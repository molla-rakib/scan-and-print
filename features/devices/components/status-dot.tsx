import { cn } from "@/lib/utils"

export function StatusDot({ online, label }: { online: boolean; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-xs sm:text-sm">
      <span className={cn("size-2 rounded-full", online ? "bg-emerald-500 shadow-[0_0_0_3px] shadow-emerald-500/20" : "bg-muted-foreground/40")} />
      {label}
    </span>
  )
}
