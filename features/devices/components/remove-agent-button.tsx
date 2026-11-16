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
  DialogTrigger,
} from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { useRemoveAgent } from "../hooks/use-remove-agent"

export function RemoveAgentButton({ agentId, name }: { agentId: string; name: string }) {
  const { open, setOpen, remove, pending } = useRemoveAgent(agentId)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon-sm" aria-label="কম্পিউটার সরান" />}>
        <Trash2Icon />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>&quot;{name}&quot; সরিয়ে ফেলবেন?</DialogTitle>
          <DialogDescription>
            এই কম্পিউটার ও এর সব প্রিন্টার আর অর্ডার পাবে না। আবার ব্যবহার করতে নতুন করে যুক্ত করতে হবে।
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>না</DialogClose>
          <Button variant="destructive" disabled={pending} onClick={remove}>
            {pending && <Spinner />} সরিয়ে ফেলুন
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
