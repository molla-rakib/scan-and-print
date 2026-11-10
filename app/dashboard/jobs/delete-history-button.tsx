"use client"

import { useState } from "react"
import { Trash2Icon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useAction } from "@/components/use-action"
import { formatNumber } from "@/lib/constants"
import { deleteOrderHistory } from "../actions"
import { ConfirmDelete } from "./confirm-delete"

/** Clears every order whose files are all completed or cancelled. */
export function DeleteHistoryButton() {
  const { pending, run } = useAction()
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => setOpen(true)}>
        <Trash2Icon /> পুরনো অর্ডার মুছুন
      </Button>
      <ConfirmDelete
        open={open}
        onOpenChange={setOpen}
        title="পুরনো অর্ডার মুছে ফেলবেন?"
        description="সম্পন্ন ও বাতিল হওয়া সব অর্ডার স্থায়ীভাবে মুছে যাবে, আয়ের হিসাব থেকেও বাদ যাবে। লাইনে বা প্রিন্টে থাকা অর্ডার মুছবে না।"
        pending={pending}
        onConfirm={() =>
          run(deleteOrderHistory, {
            onSuccess: ({ deleted }) => {
              toast.success(deleted ? `${formatNumber(deleted)}টি অর্ডার মুছে ফেলা হয়েছে` : "মুছে ফেলার মতো কোনো অর্ডার নেই")
              setOpen(false)
            },
          })
        }
      />
    </>
  )
}
