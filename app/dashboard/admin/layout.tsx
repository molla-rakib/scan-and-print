import { Suspense } from "react"
import { ShieldIcon } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { requireAdmin } from "@/lib/auth"
import { connectDb } from "@/lib/db"
import { SubscriptionPayment } from "@/lib/models"
import { AdminNav } from "./admin-nav"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageHeader title="অ্যাডমিন" description="দোকান, সাবস্ক্রিপশন এবং পেমেন্ট পরিচালনা করুন।" icon={ShieldIcon} tone="rose" />
      <Suspense fallback={<AdminNav pending={0} />}>
        <AdminNavWithCount />
      </Suspense>
      {children}
    </>
  )
}

async function AdminNavWithCount() {
  await requireAdmin()
  await connectDb()
  const pending = await SubscriptionPayment.countDocuments({ status: "pending", method: { $in: ["manual_bkash", "manual_nagad"] } })
  return <AdminNav pending={pending} />
}
