import { Suspense } from "react"
import { QrCodeIcon } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { requireShop } from "@/lib/auth"
import { PrintPosterButton } from "./components/print-poster-button"
import { QrPoster } from "./components/qr-poster"
import { ShareLinkButtons } from "./components/share-link-buttons"
import { qrSvg, shopOrderUrl } from "./queries"

/** /dashboard/qr: the shop's QR poster to print, and its order link to share. */
export function QrPage() {
  return (
    <>
      <PageHeader
        title="QR কোড ও লিংক"
        description="পোস্টার প্রিন্ট করে কাউন্টারে লাগান, অথবা লিংক শেয়ার করুন।"
        icon={QrCodeIcon}
        tone="amber"
      >
        <Suspense fallback={<PrintPosterButton />}>
          <HeaderActions />
        </Suspense>
      </PageHeader>
      <Suspense fallback={<Skeleton className="mx-auto aspect-[3/4] w-full max-w-md" />}>
        <Poster />
      </Suspense>
    </>
  )
}

async function HeaderActions() {
  const { shop } = await requireShop()
  return (
    <>
      <ShareLinkButtons url={shopOrderUrl(shop.slug)} shopName={shop.name} />
      <PrintPosterButton />
    </>
  )
}

async function Poster() {
  const { shop } = await requireShop()
  const url = shopOrderUrl(shop.slug)
  const svg = await qrSvg(url)
  return <QrPoster name={shop.name} address={shop.address} url={url} svg={svg} />
}
