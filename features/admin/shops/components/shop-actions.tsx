"use client"

import { BanIcon, CalendarPlusIcon, CheckIcon, MonitorIcon, MoreHorizontalIcon, PercentIcon, Trash2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"
import { useShopActions } from "../hooks/use-shop-actions"
import type { AdminShop } from "../types"
import { DeleteShopDialog } from "./delete-shop-dialog"
import { DeviceLimitDialog } from "./device-limit-dialog"
import { DiscountDialog } from "./discount-dialog"
import { ExtendDialog } from "./extend-dialog"

/** The "…" menu at the end of a shop row and the dialogs it opens. */
export function ShopActions({ shop }: { shop: AdminShop }) {
  const { pending, dialog, open, close, activate, suspend } = useShopActions(shop)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="আরও অপশন" disabled={pending} />}>
          {pending ? <Spinner /> : <MoreHorizontalIcon />}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          <DropdownMenuItem onClick={() => open("extend")}>
            <CalendarPlusIcon /> মেয়াদ বাড়ান
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => open("limit")}>
            <MonitorIcon /> ডিভাইস লিমিট
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => open("discount")}>
            <PercentIcon /> ছাড়
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {shop.suspended ? (
            <DropdownMenuItem onClick={activate}>
              <CheckIcon /> দোকান চালু করুন
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem variant="destructive" onClick={suspend}>
              <BanIcon /> দোকান বন্ধ করুন
            </DropdownMenuItem>
          )}
          <DropdownMenuItem variant="destructive" onClick={() => open("delete")}>
            <Trash2Icon /> দোকান মুছে ফেলুন
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DiscountDialog shop={shop} open={dialog === "discount"} onClose={close} />
      <DeleteShopDialog shop={shop} open={dialog === "delete"} onClose={close} />
      <ExtendDialog shop={shop} open={dialog === "extend"} onClose={close} />
      <DeviceLimitDialog shop={shop} open={dialog === "limit"} onClose={close} />
    </>
  )
}
