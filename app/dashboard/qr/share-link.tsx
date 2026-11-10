"use client"

import { ExternalLinkIcon, Share2Icon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

/** "Share link" and "Open link" buttons for the shop's order page, shown next to the poster button. */
export function ShareLinkButtons({ url, shopName }: { url: string; shopName: string }) {
  async function share() {
    // Phones open their share menu (WhatsApp, Messenger, SMS …); elsewhere copy the link.
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: shopName, text: `${shopName}-এ প্রিন্ট করাতে এই লিংকে ফাইল আপলোড করুন`, url })
      } catch {
        // The owner closed the share menu.
      }
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      toast.success("লিংক কপি হয়েছে")
    } catch {
      toast.error("কপি করা যায়নি")
    }
  }

  return (
    <>
      <Button variant="outline" onClick={share}>
        <Share2Icon /> লিংক শেয়ার করুন
      </Button>
      <Button variant="outline" nativeButton={false} render={<a href={url} target="_blank" rel="noreferrer" />}>
        <ExternalLinkIcon /> লিংক খুলুন
      </Button>
    </>
  )
}
