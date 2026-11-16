import Link from "next/link"
import { CheckCircle2Icon, CircleIcon, RocketIcon } from "lucide-react"
import { IconTile } from "@/components/icon-tile"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { formatNumber } from "@/lib/constants"

/** "শুরু করার ধাপ": what a new shop still has to do. Hidden once the first three steps are done. */
export function SetupChecklist({
  pairedPcs,
  enabledCount,
  paymentsReady,
}: {
  pairedPcs: number
  enabledCount: number
  paymentsReady: boolean
}) {
  const checklist = [
    { done: pairedPcs > 0, label: "দোকানের কম্পিউটারে প্রিন্ট এজেন্ট ইনস্টল করে যুক্ত করুন", href: "/dashboard/devices" },
    { done: enabledCount > 0, label: "অন্তত একটি প্রিন্টার চালু করুন", href: "/dashboard/devices" },
    { done: paymentsReady, label: "পেমেন্ট পদ্ধতি ঠিক করুন (বিকাশ বা ক্যাশ)", href: "/dashboard/settings/payment" },
    { done: false, label: "QR কোড প্রিন্ট করে কাউন্টারে লাগান", href: "/dashboard/qr" },
  ]
  const setupComplete = checklist.slice(0, 3).every((item) => item.done)
  const doneCount = checklist.filter((item) => item.done).length
  if (setupComplete) return null

  return (
    <Card className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-linear-to-br from-blue-500/12 via-violet-500/8 to-transparent" />
      <CardHeader className="relative">
        <div className="flex items-center gap-3">
          <IconTile icon={RocketIcon} tone="blue" />
          <div>
            <CardTitle>শুরু করার ধাপ</CardTitle>
            <CardDescription>অর্ডার নেওয়া শুরু করতে এগুলো শেষ করুন</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative flex flex-col gap-4">
        <Progress value={(doneCount / checklist.length) * 100}>
          <span className="text-xs text-muted-foreground">
            {formatNumber(checklist.length)}টির মধ্যে {formatNumber(doneCount)}টি সম্পন্ন
          </span>
        </Progress>
        <div className="flex flex-col gap-3">
          {checklist.map((item) => (
            <Link key={item.label} href={item.href} className="flex items-start gap-2 text-sm hover:text-primary">
              {item.done ? (
                <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-emerald-600" />
              ) : (
                <CircleIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              )}
              <span className={item.done ? "text-muted-foreground line-through" : ""}>{item.label}</span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
