"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowDownIcon, FilePlusIcon, ImageIcon, TriangleAlertIcon, UploadIcon, WalletIcon } from "lucide-react"
import { toast } from "sonner"
import { BkashButton } from "@/components/bkash"
import { CashCheckout, type CashCustomer } from "@/components/cash-checkout"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { MAX_FILES_PER_ORDER, PAPER_SIZE_LABELS, UPLOAD_CHUNK_BYTES, formatNumber, formatTaka, type PaymentMethod } from "@/lib/constants"
import type { PublicShopView } from "@/lib/public-shop"
import { cn } from "@/lib/utils"
import { FileCard, fileTotal, printedPages, type FileItem, type PrintOptions } from "./file-card"
import { prepareImageForUpload } from "./prepare-image"
import { isImageFile } from "./preview"

// Separate pickers: on Android, an input that accepts images opens the photo picker, which hides PDFs.
const ACCEPT_PDF = "application/pdf,.pdf"
const ACCEPT_IMAGES = "image/jpeg,image/png"

type Uploaded = { order: string; file: { id: string; pageCount: number } }

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

/** Sends one request with upload progress. Resolves with the JSON response. */
function send(url: string, body: XMLHttpRequestBodyInit, onProgress: (loaded: number) => void, onSent?: () => void) {
  return new Promise<Record<string, unknown>>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("POST", url)
    xhr.responseType = "json"
    xhr.upload.onprogress = (e) => onProgress(e.loaded)
    if (onSent) xhr.upload.onload = onSent
    xhr.onload = () => {
      const data = xhr.response ?? {}
      if (xhr.status < 300) resolve(data)
      else reject(Object.assign(new Error(data.error || "ফাইল আপলোড ব্যর্থ হয়েছে। আবার চেষ্টা করুন।"), { status: xhr.status }))
    }
    xhr.onerror = () => reject(Object.assign(new Error("ইন্টারনেট সংযোগে সমস্যা। আবার চেষ্টা করুন।"), { status: 0 }))
    xhr.send(body)
  })
}

/**
 * Uploads one file into the draft order (created by the first upload), reporting progress in percent.
 * Files above UPLOAD_CHUNK_BYTES go in pieces, because Vercel rejects request bodies over 4.5 MB; each
 * piece is retried a couple of times on a flaky connection.
 */
async function uploadFile(slug: string, file: File, order: string | null, onProgress: (percent: number) => void, onSent: () => void) {
  const form = new FormData()
  form.append("slug", slug)
  if (order) form.append("order", order)
  const percent = (sent: number) => onProgress(Math.min(100, Math.round((sent / Math.max(file.size, 1)) * 100)))

  if (file.size <= UPLOAD_CHUNK_BYTES) {
    form.append("file", file)
    // onSent fires once the bytes are out and the server starts checking the file.
    return (await send("/api/public/orders", form, percent, onSent)) as Uploaded
  }

  const uploadId = crypto.randomUUID().replaceAll("-", "")
  const parts = Math.ceil(file.size / UPLOAD_CHUNK_BYTES)
  for (let index = 0; index < parts; index++) {
    const start = index * UPLOAD_CHUNK_BYTES
    const piece = file.slice(start, start + UPLOAD_CHUNK_BYTES)
    const url = `/api/public/uploads?slug=${encodeURIComponent(slug)}&upload=${uploadId}&index=${index}`
    for (let attempt = 1; ; attempt++) {
      try {
        await send(url, piece, (loaded) => percent(start + loaded))
        break
      } catch (error) {
        const status = (error as { status?: number }).status ?? 0
        // Retry only network failures and server hiccups, not "this shop is closed" and the like.
        if (attempt >= 3 || (status >= 400 && status < 500)) throw error
        await new Promise((resolve) => setTimeout(resolve, attempt * 1500))
      }
    }
  }
  onSent()
  form.append("upload", uploadId)
  form.append("parts", String(parts))
  form.append("name", file.name)
  return (await send("/api/public/orders", form, () => {})) as Uploaded
}

const DEFAULT_OPTIONS: PrintOptions = { colorMode: "bw", copies: 1, duplex: false, paperSize: "A4", pages: [] }

export function PrintFlow({ shop, maxUploadMb }: { shop: PublicShopView; maxUploadMb: number }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [items, setItems] = useState<FileItem[]>([])
  const [paying, setPaying] = useState<PaymentMethod | null>(null)
  // Latest items for the upload loop, which runs across renders.
  const itemsRef = useRef<FileItem[]>([])
  const orderRef = useRef<string | null>(null)
  const uploadingRef = useRef(false)
  const paymentRef = useRef<HTMLDivElement>(null)
  const [paymentVisible, setPaymentVisible] = useState(true)

  // The total bar at the bottom shows only while the payment card is off screen.
  const hasItems = items.length > 0
  useEffect(() => {
    const element = paymentRef.current
    if (!element) return
    const observer = new IntersectionObserver(([entry]) => setPaymentVisible(entry.isIntersecting))
    observer.observe(element)
    return () => observer.disconnect()
  }, [hasItems])

  function update(fn: (items: FileItem[]) => FileItem[]) {
    itemsRef.current = fn(itemsRef.current)
    setItems(itemsRef.current)
  }
  const patch = (key: string, value: Partial<FileItem>) =>
    update((list) => list.map((item) => (item.key === key ? { ...item, ...value } : item)))

  /** Uploads waiting files one at a time, so they all join the same order. */
  async function uploadQueue() {
    if (uploadingRef.current) return
    uploadingRef.current = true
    try {
      for (;;) {
        const next = itemsRef.current.find((item) => item.state === "waiting")
        if (!next) break
        patch(next.key, { state: "analyzing", progress: 0 })
        try {
          // Photos become JPEGs here: much faster for the server and smaller to upload.
          const file = await prepareImageForUpload(next.file)
          if (file.size > maxUploadMb * 1024 * 1024) throw new Error(`ফাইলটি অনেক বড়। সর্বোচ্চ ${formatNumber(maxUploadMb)} MB।`)
          // The converted photo is also what the preview shows.
          patch(next.key, { state: "uploading", file })
          const result = await uploadFile(
            shop.slug,
            file,
            orderRef.current,
            (progress) => patch(next.key, { progress }),
            () => patch(next.key, { state: "analyzing" })
          )
          orderRef.current = result.order
          patch(next.key, { state: "ready", id: result.file.id, pageCount: result.file.pageCount })
        } catch (error) {
          patch(next.key, { state: "error", error: (error as Error).message })
        }
      }
    } finally {
      uploadingRef.current = false
    }
  }

  function addFiles(list: FileList | null | undefined) {
    const files = Array.from(list ?? [])
    for (const input of [inputRef.current, imageInputRef.current]) if (input) input.value = ""
    if (!files.length) return
    const room = MAX_FILES_PER_ORDER - itemsRef.current.length
    if (files.length > room) toast.error(`একটি অর্ডারে সর্বোচ্চ ${formatNumber(MAX_FILES_PER_ORDER)}টি ফাইল দেওয়া যাবে।`)

    const added: FileItem[] = []
    for (const file of files.slice(0, Math.max(room, 0))) {
      const supported = file.type === "application/pdf" || /\.pdf$/i.test(file.name) || isImageFile(file)
      // Photos are checked after they are converted, which usually shrinks them a lot.
      const tooBig = !isImageFile(file) && file.size > maxUploadMb * 1024 * 1024
      added.push({
        key: crypto.randomUUID(),
        file,
        state: supported && !tooBig ? "waiting" : "error",
        error: !supported
          ? "শুধু PDF, JPG বা PNG ফাইল দেওয়া যাবে।"
          : tooBig
            ? `ফাইলটি অনেক বড়। সর্বোচ্চ ${formatNumber(maxUploadMb)} MB।`
            : undefined,
        progress: 0,
        options: DEFAULT_OPTIONS,
      })
    }
    update((list) => [...list, ...added])
    uploadQueue()
  }

  async function removeItem(item: FileItem) {
    update((list) => list.filter((i) => i.key !== item.key))
    if (item.id && orderRef.current) {
      await fetch(`/api/public/orders/${orderRef.current}/files/${item.id}`, { method: "DELETE" }).catch(() => {})
    }
  }

  const ready = items.filter((item) => item.state === "ready")
  const busy = items.some((item) => ["waiting", "uploading", "analyzing"].includes(item.state))
  const total = Math.round(ready.reduce((sum, item) => sum + fileTotal(shop, item), 0) * 100) / 100
  const pages = ready.reduce((sum, item) => sum + printedPages(item) * item.options.copies, 0)
  const canPay = ready.length > 0 && !busy && !paying

  async function checkout(method: PaymentMethod, customer?: CashCustomer) {
    if (!orderRef.current) return
    setPaying(method)
    try {
      const { redirectUrl } = await postJson<{ redirectUrl: string }>(`/api/public/orders/${orderRef.current}/checkout`, {
        files: ready.map((item) => ({ id: item.id, ...item.options })),
        method,
        customer,
      })
      window.location.assign(redirectUrl)
    } catch (error) {
      toast.error((error as Error).message)
      setPaying(null)
    }
  }

  const fileInputs = (
    <>
      <input ref={inputRef} type="file" multiple accept={ACCEPT_PDF} className="hidden" onChange={(e) => addFiles(e.target.files)} />
      <input
        ref={imageInputRef}
        type="file"
        multiple
        accept={ACCEPT_IMAGES}
        className="hidden"
        onChange={(e) => addFiles(e.target.files)}
      />
    </>
  )

  const dropHandlers = {
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(true)
    },
    onDragLeave: () => setDragging(false),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      addFiles(e.dataTransfer.files)
    },
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <ol className="mb-3 grid grid-cols-3 gap-2 text-center text-xs">
            {["ফাইল দিন", "কীভাবে প্রিন্ট হবে বাছুন", "পেমেন্ট করুন"].map((step, i) => (
              <li key={step} className="flex flex-col items-center gap-1.5">
                <span
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full text-sm font-semibold",
                    i === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}
                >
                  {formatNumber(i + 1)}
                </span>
                <span className={i === 0 ? "font-medium" : "text-muted-foreground"}>{step}</span>
              </li>
            ))}
          </ol>
          <CardTitle>আপনার ফাইল আপলোড করুন</CardTitle>
          <CardDescription className="flex flex-col">
            {shop.papers.map((p) => (
              <span key={p.size}>
                {shop.papers.length > 1 && `${PAPER_SIZE_LABELS[p.size]}: `}
                সাদা-কালো {formatTaka(p.bw)}/পৃষ্ঠা
                {shop.hasColor && <> · রঙিন {formatTaka(p.color)}/পৃষ্ঠা</>}
              </span>
            ))}
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
            onClick={() => inputRef.current?.click()}
            {...dropHandlers}
            className={cn(
              "flex flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50",
              dragging && "border-primary bg-muted/60"
            )}
          >
            <span className="flex size-12 items-center justify-center rounded-full bg-primary/5">
              <UploadIcon className="size-6" />
            </span>
            <span className="font-medium">PDF ফাইল বেছে নিন</span>
            <span className="text-sm text-muted-foreground">
              একসাথে একাধিক ফাইল দেওয়া যাবে · প্রতিটি সর্বোচ্চ {formatNumber(maxUploadMb)} MB
            </span>
          </button>
          <Button variant="outline" className="h-11" onClick={() => imageInputRef.current?.click()}>
            <ImageIcon /> ছবি প্রিন্ট করুন (JPG, PNG)
          </Button>
          {fileInputs}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-3" {...dropHandlers}>
      {items.map((item, i) => (
        <FileCard
          key={item.key}
          item={item}
          index={items.length > 1 ? i + 1 : null}
          shop={shop}
          disabled={!!paying}
          onChange={(options) => patch(item.key, { options })}
          onRemove={() => removeItem(item)}
        />
      ))}

      {items.length < MAX_FILES_PER_ORDER && (
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className={cn("h-12 border-dashed", dragging && "border-primary bg-muted/60")}
            disabled={!!paying}
            onClick={() => inputRef.current?.click()}
          >
            <FilePlusIcon /> আরও PDF
          </Button>
          <Button
            variant="outline"
            className={cn("h-12 border-dashed", dragging && "border-primary bg-muted/60")}
            disabled={!!paying}
            onClick={() => imageInputRef.current?.click()}
          >
            <ImageIcon /> আরও ছবি
          </Button>
        </div>
      )}
      {fileInputs}

      <Card ref={paymentRef} className="scroll-mt-4 ring-2 ring-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <WalletIcon className="size-5 text-primary" /> পেমেন্ট
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-end justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            {formatNumber(ready.length)}টি ফাইল · মোট {formatNumber(pages)} পৃষ্ঠা
            {busy && <span className="block text-amber-700 dark:text-amber-400">ফাইল আপলোড শেষ হলে পেমেন্ট করা যাবে।</span>}
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">সব মিলিয়ে</div>
            <div className="text-3xl font-bold text-primary tabular-nums">{formatTaka(total)}</div>
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-2">
          {shop.payments.bkash && (
            <BkashButton label="দিয়ে পেমেন্ট করুন" pending={paying === "bkash"} disabled={!canPay} onClick={() => checkout("bkash")} />
          )}
          {shop.payments.cash && (
            <CashCheckout
              fields={shop.cashFields}
              amount={total}
              outline={shop.payments.bkash}
              pending={paying === "cash"}
              disabled={!canPay}
              onSubmit={(customer) => checkout("cash", customer)}
            />
          )}
        </CardFooter>
      </Card>

      {/* With several files the payment card is far down; keep the total in reach. */}
      {!paymentVisible && ready.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-3 shadow-lg backdrop-blur">
          <div className="mx-auto flex max-w-md items-center justify-between gap-3">
            <div>
              <div className="text-xs text-muted-foreground">সব মিলিয়ে</div>
              <div className="text-xl font-bold text-primary tabular-nums">{formatTaka(total)}</div>
            </div>
            <Button
              size="lg"
              className="h-11"
              onClick={() => paymentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            >
              পেমেন্টে যান <ArrowDownIcon />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
