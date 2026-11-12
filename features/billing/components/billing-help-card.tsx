import { WhatsAppIcon } from "@/components/whatsapp-icon"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { SUPPORT_WHATSAPP } from "@/lib/constants"

/** Below the subscription card: who to contact about payments or a bigger device limit. */
export function BillingHelpCard() {
  return (
    <Card className="min-w-0">
      <CardContent className="flex flex-col gap-3 text-sm">
        <div className="flex items-start gap-3">
          <WhatsAppIcon className="mt-0.5 size-8" />
          <div className="flex flex-col gap-1">
            <span className="font-semibold">সাহায্য লাগবে?</span>
            <span className="text-muted-foreground">
              পেমেন্টে কোনো সমস্যা, কোনো প্রশ্ন বা ডিভাইস লিমিট বাড়াতে চাইলে আমাদের WhatsApp-এ মেসেজ দিন।
            </span>
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full"
          render={<a href={SUPPORT_WHATSAPP.href} target="_blank" rel="noopener noreferrer" />}
          nativeButton={false}
        >
          <WhatsAppIcon className="size-4" /> {SUPPORT_WHATSAPP.display}
        </Button>
      </CardContent>
    </Card>
  )
}
