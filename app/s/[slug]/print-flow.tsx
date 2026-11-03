"use client"

import { useRef, useState } from "react"
import { BanknoteIcon, FileTextIcon, MinusIcon, PlusIcon, TriangleAlertIcon, UploadIcon, XIcon } from "lucide-react"
import { toast } from "sonner"
import { BkashButton } from "@/components/bkash"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldContent, FieldDescription, FieldLabel, FieldTitle } from "@/components/ui/field"
import { Progress } from "@/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { MAX_COPIES, formatNumber, formatTaka, type ColorMode, type PaymentMethod } from "@/lib/constants"
import type { PublicShopView } from "@/lib/public-shop"
import { cn } from "@/lib/utils"

type Uploaded = { publicId: string; pageCount: number; fileName: string }

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || "কিছু একটা সমস্যা হয়েছে। আবার চেষ্টা করুন।")
  return data as T
}

/** Uploads straight to storage with a signed form, reporting progress. */
function uploadToStorage(url: string, fields: Record<string, string>, file: File, onProgress: (percent: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const form = new FormData()
    for (const [key, value] of Object.entries(fields)) form.append(key, value)
    form.append("file", file)

    const xhr = new XMLHttpRequest()
    xhr.open("POST", url)
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100))
    xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error("ফাইল আপলোড ব্যর্থ হয়েছে। আবার চেষ্টা করুন।")))
    xhr.onerror = () => reject(new Error("ইন্টারনেট সংযোগে সমস্যা। আবার চেষ্টা করুন।"))
    xhr.send(form)
  })
}

export function PrintFlow({ shop, maxUploadMb }: { shop: PublicShopView; maxUploadMb: number }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [stage, setStage] = useState<"idle" | "uploading" | "analyzing">("idle")
  const [progress, setProgress] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [uploaded, setUploaded] = useState<Uploaded | null>(null)
  const [colorMode, setColorMode] = useState<ColorMode>("bw")
  const [copies, setCopies] = useState(1)
  const [paying, setPaying] = useState<PaymentMethod | null>(null)

  async function handleFile(file: File | undefined) {
    if (!file) return
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return void toast.error("শুধু PDF ফাইল আপলোড করা যাবে।")
    }
    if (file.size > maxUploadMb * 1024 * 1024) {
      return void toast.error(`ফাইলটি অনেক বড়। সর্বোচ্চ ${formatNumber(maxUploadMb)} MB।`)
    }

    try {
      setStage("uploading")
      setProgress(0)
      const presigned = await postJson<{ key: string; url: string; fields: Record<string, string> }>("/api/public/upload", {
        slug: shop.slug,
        size: file.size,
      })
      await uploadToStorage(presigned.url, presigned.fields, file, setProgress)

      setStage("analyzing")
      const job = await postJson<{ publicId: string; pageCount: number }>("/api/public/jobs", {
        slug: shop.slug,
        key: presigned.key,
        fileName: file.name,
      })
      setUploaded({ ...job, fileName: file.name })
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setStage("idle")
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  async function checkout(method: PaymentMethod) {
    if (!uploaded) return
    setPaying(method)
    try {
      const { redirectUrl } = await postJson<{ redirectUrl: string }>(`/api/public/jobs/${uploaded.publicId}/checkout`, {
        colorMode,
        copies,
        method,
      })
      window.location.href = redirectUrl
    } catch (error) {
      toast.error((error as Error).message)
      setPaying(null)
    }
  }

  if (!uploaded) {
    const busy = stage !== "idle"
    return (
      <Card>
        <CardHeader>
          <CardTitle>আপনার PDF আপলোড করুন</CardTitle>
          <CardDescription>
            সাদা-কালো {formatTaka(shop.pricing.bw)}/পৃষ্ঠা
            {shop.hasColor && <> · রঙিন {formatTaka(shop.pricing.color)}/পৃষ্ঠা</>}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {!shop.online && (
            <Alert>
              <TriangleAlertIcon />
              <AlertDescription>দোকানের প্রিন্টার এই মুহূর্তে অফলাইন। অর্ডার দিলে প্রিন্টার চালু হওয়ার পর প্রিন্ট হবে।</AlertDescription>
            </Alert>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              handleFile(e.dataTransfer.files[0])
            }}
            className={cn(
              "flex flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none",
              dragging && "border-primary bg-muted/60"
            )}
          >
            {busy ? (
              <>
                <Spinner className="size-8" />
                <span className="font-medium">{stage === "uploading" ? "আপলোড হচ্ছে…" : "ফাইল যাচাই করা হচ্ছে…"}</span>
                {stage === "uploading" && <Progress value={progress} className="w-full max-w-56" />}
              </>
            ) : (
              <>
                <span className="flex size-12 items-center justify-center rounded-full bg-primary/5">
                  <UploadIcon className="size-6" />
                </span>
                <span className="font-medium">PDF ফাইল বেছে নিন</span>
                <span className="text-sm text-muted-foreground">সর্বোচ্চ {formatNumber(maxUploadMb)} MB</span>
              </>
            )}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </CardContent>
      </Card>
    )
  }

  const pricePerPage = colorMode === "color" ? shop.pricing.color : shop.pricing.bw
  const total = Math.round(pricePerPage * uploaded.pageCount * copies * 100) / 100
  const modes: { value: ColorMode; title: string; price: number; disabled?: boolean }[] = [
    { value: "bw", title: "সাদা-কালো", price: shop.pricing.bw },
    { value: "color", title: "রঙিন", price: shop.pricing.color, disabled: !shop.hasColor },
  ]

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
          <FileTextIcon className="size-8 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">{uploaded.fileName}</div>
            <div className="text-sm text-muted-foreground">{formatNumber(uploaded.pageCount)} পৃষ্ঠা</div>
          </div>
          <Button variant="ghost" size="icon-sm" aria-label="অন্য ফাইল" onClick={() => setUploaded(null)} disabled={!!paying}>
            <XIcon />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">প্রিন্টের ধরন</span>
          <RadioGroup value={colorMode} onValueChange={(value) => setColorMode(value as ColorMode)} className="grid-cols-2">
            {modes.map((mode) => (
              <FieldLabel key={mode.value} htmlFor={`mode-${mode.value}`}>
                <Field orientation="horizontal" data-disabled={mode.disabled}>
                  <FieldContent>
                    <FieldTitle>{mode.title}</FieldTitle>
                    <FieldDescription>
                      {mode.disabled ? "পাওয়া যায় না" : `${formatTaka(mode.price)}/পৃষ্ঠা`}
                    </FieldDescription>
                  </FieldContent>
                  <RadioGroupItem value={mode.value} id={`mode-${mode.value}`} disabled={mode.disabled} />
                </Field>
              </FieldLabel>
            ))}
          </RadioGroup>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">কপি সংখ্যা</span>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" aria-label="কমান" disabled={copies <= 1} onClick={() => setCopies(copies - 1)}>
              <MinusIcon />
            </Button>
            <span className="w-8 text-center text-lg font-semibold tabular-nums">{formatNumber(copies)}</span>
            <Button
              variant="outline"
              size="icon"
              aria-label="বাড়ান"
              disabled={copies >= MAX_COPIES}
              onClick={() => setCopies(copies + 1)}
            >
              <PlusIcon />
            </Button>
          </div>
        </div>

        <Separator />

        <div className="flex items-end justify-between">
          <div className="text-sm text-muted-foreground">
            {formatNumber(uploaded.pageCount)} পৃষ্ঠা × {formatNumber(copies)} কপি × {formatTaka(pricePerPage)}
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">মোট</div>
            <div className="text-2xl font-semibold tabular-nums">{formatTaka(total)}</div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex-col gap-2">
        {shop.payments.bkash && (
          <BkashButton
            label="দিয়ে পেমেন্ট করুন"
            pending={paying === "bkash"}
            disabled={!!paying}
            onClick={() => checkout("bkash")}
          />
        )}
        {shop.payments.cash && (
          <Button
            size="lg"
            variant={shop.payments.bkash ? "outline" : "default"}
            className="h-12 w-full text-base"
            disabled={!!paying}
            onClick={() => checkout("cash")}
          >
            {paying === "cash" ? <Spinner /> : <BanknoteIcon />} কাউন্টারে ক্যাশ দেব
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
