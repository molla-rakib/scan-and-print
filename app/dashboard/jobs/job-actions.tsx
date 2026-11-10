"use client"

import { Fragment } from "react"
import { CheckIcon, ChevronDownIcon, PrinterIcon, RotateCcwIcon, XIcon, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"
import { useAction as useActionHook, type useAction } from "@/components/use-action"
import type { JobStatus } from "@/lib/constants"
import { approveJob, cancelJob, markJobCompleted, reprintJob } from "../actions"

export type FileAction = { label: string; icon: LucideIcon; destructive?: boolean; onClick: () => void }
export type OrderFile = { id: string; name: string; status: JobStatus; canReprint: boolean }

/** What the owner can do with one file of an order in its current status. */
export function fileActions(file: OrderFile, run: ReturnType<typeof useAction>["run"]): FileAction[] {
  const { id, status } = file
  return [
    // Orders placed before cash orders stopped needing approval.
    status === "awaiting_approval" && {
      label: "প্রিন্ট করুন",
      icon: PrinterIcon,
      onClick: () => run(() => approveJob(id), { success: "প্রিন্ট শুরু হচ্ছে" }),
    },
    status === "failed" &&
      file.canReprint && {
        label: "আবার প্রিন্ট করুন",
        icon: RotateCcwIcon,
        onClick: () => run(() => reprintJob(id), { success: "আবার লাইনে দেওয়া হয়েছে" }),
      },
    (status === "printing" || status === "failed") && {
      label: "সম্পন্ন হিসেবে চিহ্নিত করুন",
      icon: CheckIcon,
      onClick: () => run(() => markJobCompleted(id), { success: "সম্পন্ন হিসেবে চিহ্নিত হয়েছে" }),
    },
    (status === "queued" || status === "failed" || status === "pending_payment" || status === "awaiting_approval") && {
      label: "বাতিল করুন",
      icon: XIcon,
      destructive: true,
      onClick: () => run(() => cancelJob(id), { success: "বাতিল করা হয়েছে" }),
    },
  ].filter((action): action is FileAction => !!action)
}

/**
 * "অ্যাকশন" dropdown with the print actions of an order's files (cancel, done, reprint), grouped under
 * each file's name when there are several. Shown just before the order's link menu.
 */
export function FileActionsMenu({ files }: { files: OrderFile[] }) {
  const { pending, run } = useActionHook()
  const groups = files.map((file) => ({ file, actions: fileActions(file, run) })).filter((g) => g.actions.length > 0)
  if (!groups.length) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" disabled={pending} />}>
        {pending ? <Spinner /> : null} অ্যাকশন <ChevronDownIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52">
        {groups.map(({ file, actions }, i) => (
          <Fragment key={file.id}>
            {i > 0 && <DropdownMenuSeparator />}
            <DropdownMenuGroup>
              {/* GroupLabel must sit inside a Group in Base UI. */}
              {files.length > 1 && <DropdownMenuLabel className="max-w-56 truncate">{file.name}</DropdownMenuLabel>}
              {actions.map((action) => (
                <DropdownMenuItem key={action.label} onClick={action.onClick} variant={action.destructive ? "destructive" : "default"}>
                  <action.icon /> {action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
