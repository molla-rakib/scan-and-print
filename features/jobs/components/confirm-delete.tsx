"use client"

import { Trash2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"

/** Asks before deleting; deleted orders and their files cannot be brought back. */
export function ConfirmDelete({
  open,
  onOpenChange,
  title,
  description,
  pending,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  pending: boolean
  onConfirm: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>বাতিল</DialogClose>
          <Button variant="destructive" disabled={pending} onClick={onConfirm}>
            {pending ? <Spinner /> : <Trash2Icon />} মুছে ফেলুন
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
