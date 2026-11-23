import Link from "next/link"
import { StoreIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

/**
 * Opens the shop page in counter mode in a new tab: staff take files from a pen drive or the PC (and use the
 * NID/photo/scan tools) for a walk-in customer, and the order prints as cash with no customer details.
 */
export function CounterOrderButton({ slug }: { slug: string }) {
  return (
    <Button variant="outline" nativeButton={false} render={<Link href={`/s/${slug}?counter=1`} target="_blank" rel="noopener" />}>
      <StoreIcon /> কাউন্টার অর্ডার
    </Button>
  )
}
