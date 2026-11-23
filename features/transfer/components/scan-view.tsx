"use client"

import { DownloadIcon, FileTextIcon, FilesIcon, ScanLineIcon, TimerOffIcon } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { formatNumber } from "@/lib/constants"
import { fileUrl, useScanView } from "../hooks/use-scan-view"
import type { TransferPageView } from "../queries"

const kb = (bytes: number) => `${formatNumber(Math.max(1, Math.round(bytes / 1024)))} KB`

/** "Scan to phone": the shop's scans appear here as they are made, ready to download. */
export function ScanView({ initial }: { initial: TransferPageView }) {
  const { view, files, merging, downloadAll } = useScanView(initial)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ScanLineIcon className="size-5 text-primary" /> {view.shopName}: স্ক্যান
        </CardTitle>
        <CardDescription>দোকানে স্ক্যান করা পাতা নিজে থেকেই এখানে আসবে। ডাউনলোড করে ফোনে রাখুন।</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!view.open && (
          <Alert>
            <TimerOffIcon />
            <AlertDescription>সেশন শেষ হয়েছে, ফাইলগুলো মুছে ফেলা হয়েছে। আবার লাগলে দোকানে নতুন QR চান।</AlertDescription>
          </Alert>
        )}
        {view.open && files.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">
            <Spinner className="size-6" />
            দোকানে স্ক্যান হওয়ার অপেক্ষায়…
          </div>
        )}
        {files.length > 0 && (
          <ul className="flex flex-col gap-2">
            {files.map((file, i) => (
              <li key={file.id} className="flex items-center gap-3 rounded-xl border p-2">
                {file.contentType.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element -- the shop's scan
                  <img src={fileUrl(view.id, file.id, true)} alt="" className="h-16 w-12 rounded border bg-white object-cover" />
                ) : (
                  <span className="flex h-16 w-12 items-center justify-center rounded border bg-muted text-muted-foreground">
                    <FileTextIcon />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {formatNumber(i + 1)}. {file.name}
                  </div>
                  <div className="text-xs text-muted-foreground">{kb(file.size)}</div>
                </div>
                <Button size="sm" variant="outline" nativeButton={false} render={<a href={fileUrl(view.id, file.id)} download={file.name} />}>
                  <DownloadIcon /> ডাউনলোড
                </Button>
              </li>
            ))}
          </ul>
        )}
        {files.length > 1 && (
          <Button className="h-11" disabled={merging} onClick={downloadAll}>
            {merging ? <Spinner /> : <FilesIcon />} সব পাতা একটি PDF-এ ডাউনলোড
          </Button>
        )}
        {view.open && (
          <p className="text-center text-xs text-muted-foreground">নিরাপত্তার জন্য ৩০ মিনিট পর বা দোকান শেষ করলে ফাইল মুছে যাবে।</p>
        )}
      </CardContent>
    </Card>
  )
}
