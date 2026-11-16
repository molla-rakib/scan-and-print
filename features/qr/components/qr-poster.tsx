import { Card, CardContent } from "@/components/ui/card"

/** The printable counter poster: shop name, QR code and link. */
export function QrPoster({ name, address, url, svg }: { name: string; address?: string | null; url: string; svg: string }) {
  return (
    <Card id="qr-poster" className="mx-auto w-full max-w-md overflow-hidden print:max-w-none print:shadow-none print:ring-0">
      <div className="bg-primary px-6 py-4 text-center text-primary-foreground">
        <p className="text-lg font-semibold">স্ক্যান করুন, আপলোড করুন, প্রিন্ট নিন</p>
      </div>
      <CardContent className="flex flex-col items-center gap-6 py-6 text-center">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-semibold">{name}</h2>
          {address && <p className="text-sm text-muted-foreground">{address}</p>}
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
