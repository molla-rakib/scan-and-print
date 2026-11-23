"use client"

import { CheckCircle2Icon, MonitorUpIcon, TimerOffIcon, UploadIcon, XIcon } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Spinner } from "@/components/ui/spinner"
import { TRANSFER_FILE_TYPES, formatNumber } from "@/lib/constants"
import { useReceiveView } from "../hooks/use-receive-view"
import type { TransferPageView } from "../queries"

const ACCEPT = Object.keys(TRANSFER_FILE_TYPES)
  .map((ext) => `.${ext}`)
  .join(",")

/** "Send to the shop PC": the customer picks files on the phone and sees them reach the computer. */
export function ReceiveView({ initial, maxUploadMb }: { initial: TransferPageView; maxUploadMb: number }) {
  const { view, inputRef, sending, sent, addFiles, dismiss } = useReceiveView(initial, maxUploadMb)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MonitorUpIcon className="size-5 text-primary" /> {view.shopName}: কম্পিউটারে ফাইল পাঠান
        </CardTitle>
        <CardDescription>ফাইল বেছে নিন, সাথে সাথে দোকানের কম্পিউটারে চলে যাবে। পেন ড্রাইভ লাগবে না।</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {view.open ? (
          <>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span className="flex size-12 items-center justify-center rounded-full bg-primary/5">
                <UploadIcon className="size-6" />
              </span>
              <span className="font-medium">ফাইল বেছে নিন</span>
              <span className="text-sm text-muted-foreground">
                PDF, ছবি, Word, Excel, PowerPoint · প্রতিটি সর্বোচ্চ {formatNumber(maxUploadMb)} MB
              </span>
            </button>
            <input ref={inputRef} type="file" multiple accept={ACCEPT} className="hidden" onChange={(e) => addFiles(e.target.files)} />
          </>
        ) : (
          <Alert>
            <TimerOffIcon />
            <AlertDescription>সেশন শেষ হয়েছে। আবার পাঠাতে দোকানে নতুন QR চান।</AlertDescription>
          </Alert>
        )}

        {(sending.length > 0 || sent.length > 0) && (
          <ul className="flex flex-col gap-2">
            {sending.map((item) => (
              <li key={item.key} className="flex items-center gap-3 rounded-xl border p-3 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{item.name}</div>
                  {item.error ? (
                    <div className="text-xs text-destructive">{item.error}</div>
                  ) : (
                    <Progress value={item.progress} className="mt-1.5" />
                  )}
                </div>
                {item.error && (
                  <Button variant="ghost" size="icon-sm" aria-label="সরান" onClick={() => dismiss(item.key)}>
                    <XIcon />
                  </Button>
                )}
              </li>
            ))}
            {sent.map((file) => (
              <li key={file.id} className="flex items-center gap-3 rounded-xl border p-3 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{file.name}</div>
                  <div className="text-xs text-muted-foreground">{formatNumber(Math.max(1, Math.round(file.size / 1024)))} KB</div>
                </div>
                {file.fetched ? (
                  <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2Icon className="size-4" /> কম্পিউটারে পৌঁছেছে
                  </span>
                ) : (
                  <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                    <Spinner className="size-3.5" /> যাচ্ছে…
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="text-center text-xs text-muted-foreground">কম্পিউটারে পৌঁছানোর পর ফাইলটি আমাদের সার্ভার থেকে মুছে যায়।</p>
      </CardContent>
    </Card>
  )
}
