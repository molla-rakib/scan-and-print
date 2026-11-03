"use client"

import { PrinterIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

export function PrintPosterButton() {
  return (
    <Button onClick={() => window.print()}>
      <PrinterIcon /> পোস্টার প্রিন্ট করুন
    </Button>
  )
}
