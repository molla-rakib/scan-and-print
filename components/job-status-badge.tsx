import { Badge } from "@/components/ui/badge"
import { JOB_STATUS_LABELS, type JobStatus } from "@/lib/constants"
import { cn } from "@/lib/utils"

const styles: Record<JobStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  pending_payment: "bg-muted text-muted-foreground",
  awaiting_approval: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  queued: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  printing: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
  completed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  failed: "bg-destructive/10 text-destructive",
  cancelled: "bg-muted text-muted-foreground line-through",
}

export function JobStatusBadge({ status }: { status: JobStatus }) {
  return <Badge className={cn("border-0", styles[status])}>{JOB_STATUS_LABELS[status]}</Badge>
}
