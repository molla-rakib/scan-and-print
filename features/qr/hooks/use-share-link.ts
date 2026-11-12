"use client"

import { toast } from "sonner"

/** Shares the shop's order link: the phone's share menu where there is one, else copies it. */
export function useShareLink(url: string, shopName: string) {
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

  return { share }
}
