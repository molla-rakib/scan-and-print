"use client"

import { useState } from "react"
import { IdCardIcon, ScanLineIcon, SignatureIcon, SquareUserIcon, type LucideIcon } from "lucide-react"
import type { JobKind } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { FormPhotoTool } from "./form-photo-tool"
import { IdCardTool } from "./id-card-tool"
import { PhotoTool } from "./photo-tool"
import { ScanTool } from "./scan-tool"

type Tool = "id-card" | "scan" | "photo" | "form"

const TOOLS: { id: Tool; icon: LucideIcon; title: string; hint: string }[] = [
  { id: "id-card", icon: IdCardIcon, title: "NID / আইডি কার্ড কপি", hint: "দুই পাশ এক পাতায়" },
  { id: "photo", icon: SquareUserIcon, title: "পাসপোর্ট ছবি", hint: "সঠিক মাপে প্রিন্ট" },
  { id: "scan", icon: ScanLineIcon, title: "ডকুমেন্ট স্ক্যান", hint: "কাগজের ছবি থেকে PDF" },
  { id: "form", icon: SignatureIcon, title: "ফর্মের ছবি ও সই", hint: "অনলাইন আবেদনের মাপে" },
]

/**
 * The tools on the shop page. Each opens in a dialog and, except the free form-photo tool, hands its finished
 * PDF to the order like an uploaded file. A tool is mounted only while open, so it starts fresh each time.
 */
export function ToolsGrid({
  photoSheetPrice,
  disabled,
  onFile,
  compact,
}: {
  /** Price of a passport photo sheet, or null when the shop doesn't offer them. */
  photoSheetPrice: number | null
  disabled?: boolean
  /** `color`: the tool made a color result (prints in color by default). */
  onFile: (file: File, kind: JobKind, color: boolean) => void
  compact?: boolean
}) {
  const [open, setOpen] = useState<Tool | null>(null)
  const tools = TOOLS.filter((tool) => tool.id !== "photo" || photoSheetPrice !== null)
  const close = (value: boolean) => !value && setOpen(null)

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        {tools.map(({ id, icon: Icon, title, hint }) => (
          <button
            key={id}
            type="button"
            disabled={disabled}
            onClick={() => setOpen(id)}
            className={cn(
              "flex gap-3 rounded-2xl bg-card text-left shadow-sm ring-1 ring-foreground/5 transition outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.98] disabled:opacity-50",
              compact ? "items-center p-2.5" : "flex-col items-start p-3.5"
            )}
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="size-5" />
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-sm leading-tight font-semibold">{title}</span>
              {!compact && <span className="text-xs text-muted-foreground">{hint}</span>}
            </span>
          </button>
        ))}
      </div>

      {open === "id-card" && <IdCardTool open onOpenChange={close} onDone={(file, color) => onFile(file, "id-card", color)} />}
      {open === "scan" && <ScanTool open onOpenChange={close} onDone={(file, color) => onFile(file, "scan", color)} />}
      {open === "photo" && photoSheetPrice !== null && (
        <PhotoTool open onOpenChange={close} sheetPrice={photoSheetPrice} onDone={(file) => onFile(file, "photo-sheet", true)} />
      )}
      {open === "form" && <FormPhotoTool open onOpenChange={close} />}
    </>
  )
}
