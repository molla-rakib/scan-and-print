"use client"

import { TriangleAlertIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { useDeleteShopDialog } from "../hooks/use-delete-shop-dialog"
import type { AdminShop } from "../types"

/** Deletes a shop and all its data for good, after the admin types the shop's link. */
export function DeleteShopDialog({ shop, open, onClose }: { shop: AdminShop; open: boolean; onClose: () => void }) {
  const { confirm, setConfirm, matches, pending, onOpenChange, submit } = useDeleteShopDialog(shop, onClose)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form className="grid gap-4" onSubmit={submit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <TriangleAlertIcon className="size-5" /> দোকান স্থায়ীভাবে মুছে ফেলবেন?
            </DialogTitle>
            <DialogDescription>
              <span className="font-semibold text-foreground">{shop.name}</span> ({shop.slug})
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
            <p className="font-semibold text-destructive">এটি আর ফেরানো যাবে না। যা যা চিরতরে মুছে যাবে:</p>
            <ul className="flex list-disc flex-col gap-1 pl-5">
              <li>দোকানের সব অর্ডার, প্রিন্টের ইতিহাস ও জমা থাকা ফাইল</li>
              <li>যুক্ত করা কম্পিউটার ও প্রিন্টার (এজেন্ট আর প্রিন্ট করবে না)</li>
              <li>সাবস্ক্রিপশন পেমেন্টের সব রেকর্ড (আয়ের হিসাব থেকেও বাদ যাবে)</li>
              <li>দোকানের লিংক ও QR কোড আর কাজ করবে না</li>
            </ul>
            <p className="text-muted-foreground">মালিকের Google লগইন থেকে যাবে। শুধু সাময়িক বন্ধ রাখতে চাইলে &quot;দোকান বন্ধ করুন&quot; ব্যবহার করুন।</p>
          </div>

          <Field>
            <FieldLabel htmlFor={`delete-${shop.id}`}>
              নিশ্চিত করতে দোকানের লিংক লিখুন: <span className="font-mono font-semibold">{shop.slug}</span>
            </FieldLabel>
            <Input
              id={`delete-${shop.id}`}
              autoComplete="off"
              spellCheck={false}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder={shop.slug}
            />
          </Field>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>বাতিল</DialogClose>
            <Button type="submit" variant="destructive" disabled={!matches || pending}>
              {pending && <Spinner />} চিরতরে মুছে ফেলুন
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
