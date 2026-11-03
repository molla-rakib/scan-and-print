import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { IconTile, toneStyles, type Tone } from "@/components/icon-tile"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function StatCard({
  label,
  value,
  icon,
  tone,
  href,
}: {
  label: string
  value: string
  icon: LucideIcon
  tone: Tone
  href?: string
}) {
  const card = (
    <Card className={cn("relative h-full overflow-hidden transition-shadow", href && "hover:shadow-md")}>
      <div aria-hidden className={cn("pointer-events-none absolute inset-0 bg-linear-to-br to-transparent", toneStyles[tone].glow)} />
      <CardContent className="relative flex items-center gap-4">
        <IconTile icon={icon} tone={tone} className="size-12 rounded-lg" />
        <div className="min-w-0">
          <div className="truncate text-sm text-muted-foreground">{label}</div>
          <div className="text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
        </div>
      </CardContent>
    </Card>
  )
  return href ? <Link href={href}>{card}</Link> : card
}
