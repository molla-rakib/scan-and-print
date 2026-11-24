"use client"

import { XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

/** Large rounded action button used across the tools (footer and main actions). */
export const TOOL_BUTTON = "h-12 rounded-xl text-base font-semibold"
/** iOS-style tinted button: primary text on a light primary fill. */
export const TINTED = "bg-primary/10 text-primary hover:bg-primary/15 dark:bg-primary/20 dark:hover:bg-primary/25"
/** Small muted label above a control. */
export const FIELD_LABEL = "px-0.5 text-sm font-medium text-muted-foreground"

/** DialogContent classes for a sheet: slides up from the bottom on phones, a rounded centered card above that. */
export const SHEET_CONTENT = cn(
  "flex max-h-[92svh] flex-col gap-0 overflow-hidden rounded-[1.75rem] p-0 shadow-2xl ring-black/5",
  "max-sm:top-auto max-sm:bottom-0 max-sm:max-w-full max-sm:translate-y-0 max-sm:rounded-b-none max-sm:duration-300 max-sm:data-open:slide-in-from-bottom max-sm:data-closed:slide-out-to-bottom"
)

/** Grabber, title, description and a round close button at the top of a sheet. */
export function SheetHeader({ title, description }: { title: string; description?: React.ReactNode }) {
  return (
    <>
      <div aria-hidden className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-foreground/15 sm:hidden" />
      <div className="flex items-start gap-3 px-5 pt-3 pb-4 sm:pt-5">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <DialogTitle className="text-xl leading-snug font-semibold tracking-tight">{title}</DialogTitle>
          {description && <DialogDescription className="leading-relaxed">{description}</DialogDescription>}
        </div>
        <DialogClose
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              className="-mr-1 shrink-0 rounded-full bg-foreground/[0.06] text-muted-foreground hover:bg-foreground/10"
            />
          }
        >
          <XIcon className="size-4" strokeWidth={2.5} />
          <span className="sr-only">Close</span>
        </DialogClose>
      </div>
    </>
  )
}

/** The bottom bar of a sheet, clear of the phone's home indicator. */
export function SheetFooter({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("shrink-0 border-t border-border/60 bg-background px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]", className)}>
      {children}
    </div>
  )
}

/**
 * The shell every shop-page tool opens in: a bottom sheet on phones, a centered card on larger screens, with a
 * title, a scrolling body and a footer of actions.
 */
export function ToolDialog({
  open,
  onOpenChange,
  title,
  description,
  footer,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: React.ReactNode
  footer?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className={cn(SHEET_CONTENT, "sm:max-w-lg")}>
        <SheetHeader title={title} description={description} />
        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 pt-1 pb-5">{children}</div>
        {footer && <SheetFooter>{footer}</SheetFooter>}
      </DialogContent>
    </Dialog>
  )
}

/** A grouped block inside a tool, on a soft grey fill, with an optional title and badge. */
export function ToolCard({
  title,
  badge,
  className,
  children,
}: {
  title?: React.ReactNode
  badge?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <section className={cn("flex flex-col gap-3 rounded-2xl bg-muted/70 p-4", className)}>
      {title && (
        <h3 className="flex items-center gap-2 font-semibold">
          {title}
          {badge && <span className="rounded-full bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground">{badge}</span>}
        </h3>
      )}
      {children}
    </section>
  )
}

/** A small muted hint line. */
export function ToolHint({ className, children }: { className?: string; children: React.ReactNode }) {
  return <p className={cn("text-sm leading-relaxed text-muted-foreground", className)}>{children}</p>
}

/** A mini A4 sheet showing where things land when printed. */
export function SheetPreview({ aspect, children }: { aspect: string; children: React.ReactNode }) {
  return (
    <ToolCard className="items-center">
      <span className={cn(FIELD_LABEL, "self-start")}>প্রিন্ট প্রিভিউ</span>
      <div className="relative w-36 rounded-[3px] bg-white shadow-md ring-1 ring-black/5" style={{ aspectRatio: aspect }}>
        {children}
      </div>
    </ToolCard>
  )
}
