import { MonitorIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { PairPcButton } from "./pair-pc-button"

/** Shown until the shop pairs its first PC. */
export function NoAgentsCard() {
  return (
    <Card>
      <CardContent>
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MonitorIcon />
            </EmptyMedia>
            <EmptyTitle>এখনো কোনো কম্পিউটার যুক্ত হয়নি</EmptyTitle>
            <EmptyDescription>
              যে কম্পিউটারে আপনার প্রিন্টারগুলো ইনস্টল করা আছে, সেখানে প্রিন্ট এজেন্ট ইনস্টল করুন। তারপর &quot;কম্পিউটার যুক্ত
              করুন&quot; চাপে কোডটি এজেন্টে দিন।
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <PairPcButton />
          </EmptyContent>
        </Empty>
      </CardContent>
    </Card>
  )
}
