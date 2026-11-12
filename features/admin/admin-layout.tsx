import { Suspense } from "react"
import { ShieldIcon } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { requireAdmin } from "@/lib/auth"
import { connectDb } from "@/lib/db"
import { AdminNav } from "./components/admin-nav"
import { countPendingManualPayments } from "./queries"

/** Shell of every /dashboard/admin page: header and tabs. Admin access is checked here (and on each page). */
export function AdminLayout({ children }: { children: React.ReactNode }) {
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
  const pending = await countPendingManualPayments()
  return <AdminNav pending={pending} />
}
