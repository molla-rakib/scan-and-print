"use client"

import { useRef, useState } from "react"
import { FilePlusIcon, TriangleAlertIcon, UploadIcon } from "lucide-react"
import { toast } from "sonner"
import { BkashButton } from "@/components/bkash"
import { CashCheckout, type CashCustomer } from "@/components/cash-checkout"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { MAX_FILES_PER_ORDER, PAPER_SIZE_LABELS, formatNumber, formatTaka, type PaymentMethod } from "@/lib/constants"
import type { PublicShopView } from "@/lib/public-shop"
import { cn } from "@/lib/utils"
import { FileCard, fileTotal, printedPages, type FileItem, type PrintOptions } from "./file-card"
import { isImageFile } from "./preview"

const ACCEPT = "application/pdf,.pdf,image/jpeg,.jpg,.jpeg,image/png,.png"

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

/** Uploads one file into the draft order (created by the first upload), reporting progress. */
function uploadFile(slug: string, file: File, order: string | null, onProgress: (percent: number) => void, onSent: () => void) {
  return new Promise<Uploaded>((resolve, reject) => {
    const form = new FormData()
    form.append("slug", slug)
    form.append("file", file)
    if (order) form.append("order", order)

    const xhr = new XMLHttpRequest()
    xhr.open("POST", "/api/public/orders")
    xhr.responseType = "json"
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100))
    xhr.upload.onload = onSent
    xhr.onload = () => {
      const data = xhr.response ?? {}
      if (xhr.status < 300) resolve(data)
      else reject(new Error(data.error || "ফাইল আপলোড ব্যর্থ হয়েছে। আবার চেষ্টা করুন।"))
    }
    xhr.onerror = () => reject(new Error("ইন্টারনেট সংযোগে সমস্যা। আবার চেষ্টা করুন।"))
    xhr.send(form)
  })
}

const DEFAULT_OPTIONS: PrintOptions = { colorMode: "bw", copies: 1, duplex: false, paperSize: "A4", pages: [] }

export function PrintFlow({ shop, maxUploadMb }: { shop: PublicShopView; maxUploadMb: number }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [items, setItems] = useState<FileItem[]>([])
  const [paying, setPaying] = useState<PaymentMethod | null>(null)
  // Latest items for the upload loop, which runs across renders.
  const itemsRef = useRef<FileItem[]>([])
  const orderRef = useRef<string | null>(null)
  const uploadingRef = useRef(false)

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
        patch(next.key, { state: "uploading", progress: 0 })
        try {
          const result = await uploadFile(
            shop.slug,
            next.file,
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
    if (inputRef.current) inputRef.current.value = ""
    if (!files.length) return
    const room = MAX_FILES_PER_ORDER - itemsRef.current.length
    if (files.length > room) toast.error(`একটি অর্ডারে সর্বোচ্চ ${formatNumber(MAX_FILES_PER_ORDER)}টি ফাইল দেওয়া যাবে।`)

    const added: FileItem[] = []
    for (const file of files.slice(0, Math.max(room, 0))) {
      const supported = file.type === "application/pdf" || /\.pdf$/i.test(file.name) || isImageFile(file)
      const tooBig = file.size > maxUploadMb * 1024 * 1024
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

  const fileInput = (
    <input ref={inputRef} type="file" multiple accept={ACCEPT} className="hidden" onChange={(e) => addFiles(e.target.files)} />
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
            <span className="font-medium">PDF বা ছবি বেছে নিন</span>
            <span className="text-sm text-muted-foreground">
              একসাথে একাধিক ফাইল দেওয়া যাবে · PDF, JPG, PNG · প্রতিটি সর্বোচ্চ {formatNumber(maxUploadMb)} MB
            </span>
          </button>
          {fileInput}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-3" {...dropHandlers}>
      {items.map((item) => (
        <FileCard
          key={item.key}
          item={item}
          shop={shop}
          disabled={!!paying}
          onChange={(options) => patch(item.key, { options })}
          onRemove={() => removeItem(item)}
        />
      ))}

      {items.length < MAX_FILES_PER_ORDER && (
        <Button
          variant="outline"
          className={cn("h-12 border-dashed", dragging && "border-primary bg-muted/60")}
          disabled={!!paying}
          onClick={() => inputRef.current?.click()}
        >
          <FilePlusIcon /> আরও ফাইল যোগ করুন
        </Button>
      )}
      {fileInput}

      <Card>
        <CardContent className="flex items-end justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            {formatNumber(ready.length)}টি ফাইল · মোট {formatNumber(pages)} পৃষ্ঠা
            {busy && <span className="block">ফাইল আপলোড শেষ হলে পেমেন্ট করা যাবে।</span>}
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">মোট</div>
            <div className="text-2xl font-semibold tabular-nums">{formatTaka(total)}</div>
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
    </div>
  )
}
