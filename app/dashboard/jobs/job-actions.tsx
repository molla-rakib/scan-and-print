"use client"

import { CheckIcon, MoreHorizontalIcon, PrinterIcon, RotateCcwIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"
import { useAction } from "@/components/use-action"
import type { JobStatus } from "@/lib/constants"
import { approveJob, cancelJob, markJobCompleted, reprintJob } from "../actions"

export function JobActions({ jobId, status, canReprint }: { jobId: string; status: JobStatus; canReprint: boolean }) {
  const { pending, run } = useAction()
  const actions = [
    // Orders placed before cash orders stopped needing approval.
    status === "awaiting_approval" && {
      label: "প্রিন্ট করুন",
      icon: PrinterIcon,
      onClick: () => run(() => approveJob(jobId), { success: "প্রিন্ট শুরু হচ্ছে" }),
    },
    status === "failed" &&
      canReprint && { label: "আবার প্রিন্ট করুন", icon: RotateCcwIcon, onClick: () => run(() => reprintJob(jobId), { success: "আবার লাইনে দেওয়া হয়েছে" }) },
    (status === "printing" || status === "failed") && {
      label: "সম্পন্ন হিসেবে চিহ্নিত করুন",
      icon: CheckIcon,
      onClick: () => run(() => markJobCompleted(jobId), { success: "সম্পন্ন হিসেবে চিহ্নিত হয়েছে" }),
    },
    (status === "queued" || status === "failed" || status === "pending_payment" || status === "awaiting_approval") && {
      label: "অর্ডার বাতিল করুন",
      icon: XIcon,
      destructive: true,
      onClick: () => run(() => cancelJob(jobId), { success: "অর্ডার বাতিল করা হয়েছে" }),
    },
  ].filter((action) => !!action)

  if (!actions.length) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" disabled={pending} aria-label="আরও অপশন" />}>
        {pending ? <Spinner /> : <MoreHorizontalIcon />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        {actions.map((action) => (
          <DropdownMenuItem key={action.label} onClick={action.onClick} variant={"destructive" in action ? "destructive" : "default"}>
            <action.icon /> {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
