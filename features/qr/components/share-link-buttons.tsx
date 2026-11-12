"use client"

import { ExternalLinkIcon, Share2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useShareLink } from "../hooks/use-share-link"

/** "Share link" and "Open link" buttons for the shop's order page, shown next to the poster button. */
export function ShareLinkButtons({ url, shopName }: { url: string; shopName: string }) {
  const { share } = useShareLink(url, shopName)

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
