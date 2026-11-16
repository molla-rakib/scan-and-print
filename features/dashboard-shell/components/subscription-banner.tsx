import Link from "next/link"
import { CalendarClockIcon, TriangleAlertIcon } from "lucide-react"
import { getUserAndShop } from "@/lib/auth"
import { canChangeDevices } from "@/lib/billing"
import { GRACE_DAYS, formatDate, formatNumber } from "@/lib/constants"
import { serviceEndsAt, subscriptionNotice } from "@/lib/jobs"
import { cn } from "@/lib/utils"

/**
 * Full-width notice at the top of the dashboard: orange in the last days before the end date, red during the
 * free grace days (printing still works) and once printing has stopped. Nothing otherwise.
 */
export async function SubscriptionBanner() {
  const { shop } = await getUserAndShop()
  if (!shop) return null
  const notice = subscriptionNotice(shop)
  if (!notice) return null

  const orange = notice.kind === "ending"
  const Icon = orange ? CalendarClockIcon : TriangleAlertIcon
  const days = formatNumber(notice.days)

  return (
    <div
      role={orange ? "status" : "alert"}
      className={cn(
        "flex flex-col gap-2 border-b px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8",
        orange ? "border-orange-300 bg-orange-100 text-orange-950 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-50" : "border-red-300 bg-red-100 text-red-950 dark:border-red-900 dark:bg-red-950 dark:text-red-50"
      )}
    >
      <div className="flex items-start gap-2.5">
        <Icon className={cn("mt-0.5 size-5 shrink-0", orange ? "text-orange-600" : "text-red-600")} />
        <div className="flex flex-col">
          {notice.kind === "ending" && (
            <>
              <span className="font-semibold">আপনার পেমেন্টের মেয়াদ আর {days} দিন পর শেষ হবে ({formatDate(shop.paidUntil)})।</span>
              <span>প্রিন্ট চালু রাখতে মেয়াদ বাড়ান।{canChangeDevices(shop) && " চাইলে এখনই ডিভাইসের সংখ্যাও বদলাতে পারবেন।"}</span>
            </>
          )}
          {notice.kind === "grace" && (
            <>
              <span className="font-semibold">মেয়াদ শেষ! আর {days} দিন বাকি, এরপর আপনার প্রিন্ট কাজ করবে না।</span>
              <span>
                মেয়াদ শেষের পর {formatNumber(GRACE_DAYS)} দিন ফ্রি চালু থাকে। {formatDate(serviceEndsAt(shop))} থেকে গ্রাহকরা অর্ডার দিতে
                পারবেন না।
              </span>
            </>
          )}
          {notice.kind === "stopped" && (
            <>
              <span className="font-semibold">মেয়াদ শেষ, আপনার প্রিন্ট বন্ধ আছে।</span>
              <span>গ্রাহকরা এখন অর্ডার দিতে পারছেন না। পেমেন্ট করলেই সাথে সাথে আবার চালু হবে।</span>
            </>
          )}
        </div>
      </div>
      <Link
        href="/dashboard/billing"
        className={cn(
          "inline-flex h-9 shrink-0 items-center justify-center self-start rounded-md px-4 font-semibold text-white sm:self-auto",
          orange ? "bg-orange-600 hover:bg-orange-700" : "bg-red-600 hover:bg-red-700"
        )}
      >
        এখনই পেমেন্ট করুন
      </Link>
    </div>
  )
}
