"use client"

import { useState } from "react"
import { CopyIcon, ExternalLinkIcon, MessageCircleIcon, MoreHorizontalIcon, Share2Icon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"
import { useAction } from "@/components/use-action"
import { formatToken } from "@/lib/constants"
import { deleteOrder } from "../actions"
import { ConfirmDelete } from "./confirm-delete"

/** Order menu: open or send the customer's status page, or delete the order once nothing is waiting or printing. */
export function OrderActions({
  orderId,
  url,
  token,
  shopName,
  customerPhone,
  deletable,
}: {
  orderId: string
  url: string
  token: number
  shopName: string
  customerPhone?: string | null
  /** False while a file is waiting or printing. */
  deletable: boolean
}) {
  const { pending, run } = useAction()
  const [confirming, setConfirming] = useState(false)
  const message = `${shopName} — আপনার প্রিন্ট অর্ডার ${formatToken(token)}। অবস্থা দেখুন: ${url}`

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      toast.success("লিংক কপি হয়েছে")
    } catch {
      toast.error("কপি করা যায়নি")
    }
  }

  async function share() {
    if (typeof navigator.share !== "function") return copy()
    try {
      await navigator.share({ title: `${shopName} ${formatToken(token)}`, text: message, url })
    } catch {
      // The menu was closed.
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="অর্ডারের অপশন" disabled={pending} />}>
          {pending ? <Spinner /> : <MoreHorizontalIcon />}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-56">
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => window.open(url, "_blank", "noopener")}>
              <ExternalLinkIcon /> অর্ডার পেজ খুলুন
            </DropdownMenuItem>
            <DropdownMenuItem onClick={share}>
              <Share2Icon /> লিংক শেয়ার করুন
            </DropdownMenuItem>
            <DropdownMenuItem onClick={copy}>
              <CopyIcon /> লিংক কপি করুন
            </DropdownMenuItem>
            {customerPhone && (
              <DropdownMenuItem
                onClick={() => window.open(`https://wa.me/88${customerPhone}?text=${encodeURIComponent(message)}`, "_blank", "noopener")}
              >
                <MessageCircleIcon /> গ্রাহককে WhatsApp করুন
              </DropdownMenuItem>
            )}
          </DropdownMenuGroup>
          {deletable && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem variant="destructive" onClick={() => setConfirming(true)}>
                  <Trash2Icon /> অর্ডার মুছে ফেলুন
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDelete
        open={confirming}
        onOpenChange={setConfirming}
        title={`অর্ডার ${formatToken(token)} মুছে ফেলবেন?`}
        description="অর্ডারটি স্থায়ীভাবে মুছে যাবে, আয়ের হিসাব থেকেও বাদ যাবে।"
        pending={pending}
        onConfirm={() =>
          run(() => deleteOrder(orderId), { success: "অর্ডার মুছে ফেলা হয়েছে", onSuccess: () => setConfirming(false) })
        }
      />
    </>
  )
}
