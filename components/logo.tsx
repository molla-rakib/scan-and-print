import { PrinterIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2 font-semibold tracking-tight", className)}>
      <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <PrinterIcon className="size-4" />
      </span>
      স্ক্যান অ্যান্ড প্রিন্ট
    </span>
  )
}
