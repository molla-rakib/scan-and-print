import { KeyRoundIcon } from "lucide-react"
import { IconTile } from "@/components/icon-tile"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { formatNumber, formatTaka } from "@/lib/constants"

/** How many of the shop's licensed devices are switched on. */
export function DeviceLicenseCard({ deviceLimit, enabledCount, deviceFee }: { deviceLimit: number; enabledCount: number; deviceFee: number }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <IconTile icon={KeyRoundIcon} tone="amber" variant="soft" />
          <CardTitle>ডিভাইস লাইসেন্স</CardTitle>
        </div>
        <CardDescription>
          শুধু চালু করা প্রিন্টারে অর্ডার যায়। প্রতিটি চালু ডিভাইসের জন্য মাসে {formatTaka(deviceFee)}।
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Progress value={Math.min(100, (enabledCount / Math.max(1, deviceLimit)) * 100)}>
          <span className="text-sm">
            {formatNumber(deviceLimit)}টির মধ্যে {formatNumber(enabledCount)}টি ডিভাইস চালু
          </span>
        </Progress>
      </CardContent>
    </Card>
  )
}
