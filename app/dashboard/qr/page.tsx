import type { Metadata } from "next"
import { Suspense } from "react"
import { QrCodeIcon } from "lucide-react"
import QRCode from "qrcode"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { requireShop } from "@/lib/auth"
import { env } from "@/lib/env"
import { PrintPosterButton } from "./print-poster-button"

export const metadata: Metadata = { title: "QR কোড" }

export default function QrPage() {
  return (
    <>
      <PageHeader
        title="QR কোড"
        description="এই পোস্টারটি প্রিন্ট করে কাউন্টারে লাগান। গ্রাহক স্ক্যান করলেই আপনার দোকানের পেজ খুলবে।"
        icon={QrCodeIcon}
        tone="amber"
      >
        <PrintPosterButton />
      </PageHeader>
      <Suspense fallback={<Skeleton className="mx-auto aspect-[3/4] w-full max-w-md" />}>
        <Poster />
      </Suspense>
    </>
  )
}

async function Poster() {
  const { shop } = await requireShop()
  const url = `${env.appUrl}/s/${shop.slug}`
  const svg = await QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "M" })

  return (
    <Card id="qr-poster" className="mx-auto w-full max-w-md overflow-hidden print:max-w-none print:shadow-none print:ring-0">
      <div className="bg-primary px-6 py-4 text-center text-primary-foreground">
        <p className="text-lg font-semibold">স্ক্যান করুন, আপলোড করুন, প্রিন্ট নিন</p>
      </div>
      <CardContent className="flex flex-col items-center gap-6 py-6 text-center">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-semibold">{shop.name}</h2>
          {shop.address && <p className="text-sm text-muted-foreground">{shop.address}</p>}
        </div>
        <div className="w-full max-w-64 rounded-lg border-4 border-primary bg-white p-3" dangerouslySetInnerHTML={{ __html: svg }} />
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">PDF আপলোড করুন → বিকাশ বা ক্যাশে পেমেন্ট → টোকেন দেখিয়ে প্রিন্ট সংগ্রহ করুন</p>
        </div>
        <p className="text-xs break-all text-muted-foreground">{url}</p>
      </CardContent>
    </Card>
  )
}
