"use client"

import { ArrowDownIcon, FilePlusIcon, ImageIcon, TriangleAlertIcon, UploadIcon, WalletIcon } from "lucide-react"
import { BkashButton } from "@/components/bkash"
import { CashCheckout } from "@/components/cash-checkout"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { MAX_FILES_PER_ORDER, PAPER_SIZE_LABELS, QUEUE_EXPIRY_HOURS, formatNumber, formatTaka } from "@/lib/constants"
import type { PublicShopView } from "@/lib/public-shop"
import { cn } from "@/lib/utils"
import { usePrintFlow } from "../hooks/use-print-flow"
import { FileCard } from "./file-card"

// Separate pickers: on Android, an input that accepts images opens the photo picker, which hides PDFs.
const ACCEPT_PDF = "application/pdf,.pdf"
const ACCEPT_IMAGES = "image/jpeg,image/png"

export function PrintFlow({ shop, maxUploadMb }: { shop: PublicShopView; maxUploadMb: number }) {
  const {
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
  } = usePrintFlow(shop, maxUploadMb)

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
              <AlertDescription>দোকানের প্রিন্টার এই মুহূর্তে বন্ধ। অর্ডার দিলে প্রিন্টার চালু হওয়ার পর প্রিন্ট হবে। {formatNumber(QUEUE_EXPIRY_HOURS)} ঘণ্টার মধ্যে প্রিন্ট না হলে অর্ডারটি নিজে থেকে বাতিল হয়ে যাবে।</AlertDescription>
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
          onChange={(options) => setOptions(item.key, options)}
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
              onClick={scrollToPayment}
            >
              পেমেন্টে যান <ArrowDownIcon />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
