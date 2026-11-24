import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import bkashLogo from "@/public/images/bkash.png"

/** Full-color bKash logo. It needs a light background, so it sits in a white chip on pink buttons. */
export function BkashLogo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center rounded-sm bg-white px-1.5 py-1", className)}>
      <Image src={bkashLogo} alt="bKash" className="h-5 w-auto" priority />
    </span>
  )
}

/** bKash pay button: "<label> [bKash logo]", e.g. "Pay with bKash". */
export function BkashButton({ pending, disabled, label, onClick }: { pending: boolean; disabled: boolean; label: string; onClick: () => void }) {
  return (
    <Button
      size="lg"
      className="h-13 w-full gap-2.5 rounded-xl bg-[#E2136E] text-base font-semibold text-white shadow-sm shadow-[#E2136E]/25 hover:bg-[#c8105f]"
      disabled={disabled}
      onClick={onClick}
    >
      {pending && <Spinner />}
      <span>{label}</span>
      <BkashLogo />
    </Button>
  )
}
