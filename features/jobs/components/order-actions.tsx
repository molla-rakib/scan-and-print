"use client"

import { CopyIcon, ExternalLinkIcon, MessageCircleIcon, MoreHorizontalIcon, Share2Icon, Trash2Icon } from "lucide-react"
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
import { formatToken } from "@/lib/constants"
import { useOrderActions } from "../hooks/use-order-actions"
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
  const { pending, confirming, setConfirming, copy, share, openPage, whatsApp, confirmDelete } = useOrderActions({
    orderId,
    url,
    token,
    shopName,
    customerPhone,
  })

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="অর্ডারের অপশন" disabled={pending} />}>
          {pending ? <Spinner /> : <MoreHorizontalIcon />}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-56">
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={openPage}>
              <ExternalLinkIcon /> অর্ডার পেজ খুলুন
            </DropdownMenuItem>
            <DropdownMenuItem onClick={share}>
              <Share2Icon /> লিংক শেয়ার করুন
            </DropdownMenuItem>
            <DropdownMenuItem onClick={copy}>
              <CopyIcon /> লিংক কপি করুন
            </DropdownMenuItem>
            {customerPhone && (
              <DropdownMenuItem onClick={whatsApp}>
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
        onConfirm={confirmDelete}
      />
    </>
  )
}
