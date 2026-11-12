"use client"

import { CheckIcon, PrinterIcon, RotateCcwIcon, XIcon, type LucideIcon } from "lucide-react"
import { useAction } from "@/components/use-action"
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

/** The available actions of each file of an order (files with none left out), run through one `useAction`. */
export function useFileActions(files: OrderFile[]) {
  const { pending, run } = useAction()
  const groups = files.map((file) => ({ file, actions: fileActions(file, run) })).filter((g) => g.actions.length > 0)
  return { pending, groups }
}
