"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import type { CashCustomer } from "@/components/cash-checkout"
import { MAX_FILES_PER_ORDER, formatNumber, type PaymentMethod } from "@/lib/constants"
import type { PublicShopView } from "@/lib/public-shop"
import { effectiveOptions, fileTotal, printedPages, type FileItem, type PrintOptions } from "../lib/file-options"
import { prepareImageForUpload } from "../lib/prepare-image"
import { isImageFile } from "../lib/preview"
import { postJson, uploadFile } from "../lib/upload"

const DEFAULT_OPTIONS: PrintOptions = { colorMode: "bw", copies: 1, duplex: false, paperSize: "A4", pages: [] }

/**
 * The customer's order: picked files, their uploads into one draft order, the running total and checkout.
 */
export function usePrintFlow(shop: PublicShopView, maxUploadMb: number) {
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

  const setOptions = (key: string, options: PrintOptions) => patch(key, { options })

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
        files: ready.map((item) => ({ id: item.id, ...effectiveOptions(shop, item) })),
        method,
        customer,
      })
      window.location.assign(redirectUrl)
    } catch (error) {
      toast.error((error as Error).message)
      setPaying(null)
    }
  }

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

  const scrollToPayment = () => paymentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })

  return {
    inputRef,
    imageInputRef,
    paymentRef,
    items,
    dragging,
    paying,
    paymentVisible,
    ready,
    busy,
    total,
    pages,
    canPay,
    addFiles,
    removeItem,
    setOptions,
    checkout,
    dropHandlers,
    scrollToPayment,
  }
}
