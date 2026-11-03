import type { LucideIcon } from "lucide-react"
import { IconTile, type Tone } from "@/components/icon-tile"

export function PageHeader({
  title,
  description,
  icon,
  tone = "blue",
  children,
}: {
  title: string
  description?: string
  icon?: LucideIcon
  tone?: Tone
  children?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        {icon && <IconTile icon={icon} tone={tone} className="size-10 rounded-lg" />}
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  )
}
