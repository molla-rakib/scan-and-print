"use client"

import { PrinterIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { usePrintPoster } from "../hooks/use-print-poster"

export function PrintPosterButton() {
  const { print } = usePrintPoster()
  return (
    <Button onClick={print}>
      <PrinterIcon /> পোস্টার প্রিন্ট করুন
    </Button>
  )
}
