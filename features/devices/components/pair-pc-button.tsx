"use client"

import { CheckIcon, CopyIcon, PlusIcon } from "lucide-react"
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
import { AGENT_DOWNLOAD_URL, formatNumber } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { usePairingDialog } from "../hooks/use-pairing-dialog"

export function PairPcButton() {
  const { open, onOpenChange, pairing, status, generate, copyCode, pending } = usePairingDialog()
  const paired = status?.state === "paired"
  const expired = status?.state === "expired"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={<Button />}>
        <PlusIcon /> কম্পিউটার যুক্ত করুন
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>দোকানের কম্পিউটার যুক্ত করুন</DialogTitle>
          <DialogDescription>যে কম্পিউটারে প্রিন্টারগুলো ইনস্টল করা আছে, সেখানে এই ধাপগুলো অনুসরণ করুন।</DialogDescription>
        </DialogHeader>
        <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm">
          <li>
            কম্পিউটারে{" "}
            <a href={AGENT_DOWNLOAD_URL} download className="font-medium text-primary underline underline-offset-4">
              প্রিন্ট এজেন্ট ডাউনলোড
            </a>{" "}
            করে চালান, এটি নিজেই ইনস্টল হবে। Windows সতর্কবার্তা দেখালে &quot;More info&quot; → &quot;Run anyway&quot; চাপুন।
          </li>
          <li>এজেন্ট চালু করে নিচের পেয়ারিং কোডটি দিন।</li>
          <li>প্রিন্টারগুলো এই পেজে দেখা গেলে যেগুলো ব্যবহার করবেন সেগুলো চালু করুন।</li>
        </ol>
        {paired ? (
          <div className="flex flex-col items-center gap-2 rounded-lg bg-emerald-500/10 p-5 text-center animate-in fade-in zoom-in-95">
            <span className="flex size-12 items-center justify-center rounded-full bg-emerald-500 text-white">
              <CheckIcon className="size-6" />
            </span>
            <span className="font-semibold">কম্পিউটার যুক্ত হয়েছে</span>
            {status.machineName && <span className="font-mono text-sm text-muted-foreground">{status.machineName}</span>}
            {status.checkedIn ? (
              <span className="text-sm">
                {status.printers > 0
                  ? `${formatNumber(status.printers)}টি প্রিন্টার পাওয়া গেছে — এই পেজে যেগুলো ব্যবহার করবেন সেগুলো চালু করুন।`
                  : "কোনো প্রিন্টার পাওয়া যায়নি। কম্পিউটারে প্রিন্টার ইনস্টল করা আছে কি না দেখুন।"}
              </span>
            ) : (
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Spinner className="size-4" /> প্রিন্টার খোঁজা হচ্ছে…
              </span>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-lg bg-muted p-4">
            {pairing ? (
              <>
                <span className={cn("font-mono text-3xl font-semibold tracking-[0.3em]", expired && "text-muted-foreground line-through")}>
                  {pairing.code}
                </span>
                {expired ? (
                  <span className="text-sm text-destructive">কোডের মেয়াদ শেষ। নতুন কোড নিন।</span>
                ) : (
                  <>
                    <Button variant="ghost" size="sm" onClick={copyCode}>
                      <CopyIcon /> কপি করুন
                    </Button>
                    <span className="flex items-center gap-2 text-sm font-medium text-primary">
                      <span className="relative flex size-2.5">
                        <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
                        <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
                      </span>
                      কম্পিউটার যুক্ত হওয়ার অপেক্ষায়…
                    </span>
                  </>
                )}
              </>
            ) : (
              <Spinner className="size-6" />
            )}
            {!expired && <span className="text-xs text-muted-foreground">কোডটি ১৫ মিনিট পর্যন্ত কার্যকর থাকবে।</span>}
          </div>
        )}
        <DialogFooter>
          {!paired && (
            <Button variant="outline" onClick={generate} disabled={pending}>
              নতুন কোড
            </Button>
          )}
          <DialogClose render={<Button />}>সম্পন্ন</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
