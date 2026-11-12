import Link from "next/link"
import { ListOrderedIcon } from "lucide-react"
import { IconTile } from "@/components/icon-tile"
import { JobStatusBadge } from "@/components/job-status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { COLOR_MODE_LABELS, formatTaka, formatToken, type ColorMode, type JobStatus } from "@/lib/constants"
import type { RecentJob } from "../queries"

/** The latest few files, with a link to the full order list. */
export function RecentOrders({ jobs }: { jobs: RecentJob[] }) {
  return (
    <Card className="min-w-0 xl:col-span-2">
      <CardHeader>
        <div className="flex items-center gap-3">
          <IconTile icon={ListOrderedIcon} tone="violet" variant="soft" />
          <CardTitle>সাম্প্রতিক অর্ডার</CardTitle>
        </div>
        <CardAction>
          <Button variant="outline" size="sm" render={<Link href="/dashboard/jobs" />} nativeButton={false}>
            সব দেখুন
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {jobs.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">এখনো কোনো অর্ডার আসেনি।</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>টোকেন</TableHead>
                <TableHead>ফাইল</TableHead>
                <TableHead className="hidden sm:table-cell">ধরন</TableHead>
                <TableHead className="text-right">মূল্য</TableHead>
                <TableHead className="hidden sm:table-cell">অবস্থা</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="font-semibold text-primary">{formatToken(job.token)}</TableCell>
                  <TableCell className="max-w-40 sm:max-w-64">
                    <div className="truncate">{job.fileName}</div>
                    <div className="mt-1 sm:hidden">
                      <JobStatusBadge status={job.status as JobStatus} />
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{COLOR_MODE_LABELS[job.colorMode as ColorMode]}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{formatTaka(job.amount)}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <JobStatusBadge status={job.status as JobStatus} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
