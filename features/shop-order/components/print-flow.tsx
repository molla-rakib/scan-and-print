"use client"

import { ArrowDownIcon, BanknoteIcon, FilePlusIcon, ImageIcon, ImagePlusIcon, StoreIcon, TriangleAlertIcon, UploadIcon } from "lucide-react"
import { BkashButton } from "@/components/bkash"
import { CashCheckout } from "@/components/cash-checkout"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { MAX_FILES_PER_ORDER, PAPER_SIZE_LABELS, QUEUE_EXPIRY_HOURS, formatNumber, formatTaka } from "@/lib/constants"
import type { PublicShopView } from "@/lib/public-shop"
import { cn } from "@/lib/utils"
import { usePrintFlow } from "../hooks/use-print-flow"
import { FileCard } from "./file-card"
import { FIELD_LABEL, TINTED, TOOL_BUTTON } from "./tools/tool-dialog"
import { ToolsGrid } from "./tools/tools-grid"

// Separate pickers: on Android, an input that accepts images opens the photo picker, which hides PDFs.
const ACCEPT_PDF = "application/pdf,.pdf"
const ACCEPT_IMAGES = "image/jpeg,image/png"

const STEPS = ["ফাইল আপলোড", "প্রিন্ট সেটিংস", "পেমেন্ট"]
/** A white rounded card on the page's grey background. */
const PANEL = "rounded-2xl bg-card shadow-sm ring-1 ring-foreground/5"

/** A soft colored note with an icon. */
function Note({ icon: Icon, tone, children }: { icon: typeof StoreIcon; tone: "amber" | "primary"; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "flex gap-3 rounded-xl p-3 text-sm leading-relaxed",
        tone === "amber" ? "bg-amber-500/10 text-amber-950 dark:text-amber-100" : "bg-primary/[0.07] text-foreground"
      )}
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0", tone === "amber" ? "text-amber-600 dark:text-amber-400" : "text-primary")} />
      <p>{children}</p>
    </div>
  )
}

/**
 * The customer's order on the shop page. `counter` is the shop itself taking an order at the counter (the
 * owner, signed in, opened the page from the dashboard): cash, no customer details.
 */
export function PrintFlow({ shop, maxUploadMb, counter }: { shop: PublicShopView; maxUploadMb: number; counter: boolean }) {
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
  } = usePrintFlow(shop, maxUploadMb, counter)
  const tools = (compact: boolean) => (
    <div className="flex flex-col gap-2">
      <span className={FIELD_LABEL}>অন্যান্য সেবা</span>
      <ToolsGrid photoSheetPrice={shop.photoSheetPrice} disabled={!!paying} compact={compact} onFile={(file, kind, color) => addFiles([file], kind, color)} />
    </div>
  )
  const counterNote = counter && (
    <Note icon={StoreIcon} tone="primary">
      <span className="font-semibold">কাউন্টার অর্ডার।</span> পেন ড্রাইভ বা কম্পিউটার থেকে ফাইল দিন। পেমেন্ট ক্যাশে নেওয়া হবে, গ্রাহকের তথ্য
      লাগবে না।
    </Note>
  )

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
      <>
        <ol className="grid grid-cols-3 gap-2 px-1">
          {STEPS.map((step, i) => (
            <li key={step} className="flex flex-col gap-1.5">
              <span className={cn("h-1 rounded-full", i === 0 ? "bg-primary" : "bg-foreground/10")} />
              <span className={cn("text-xs", i === 0 ? "font-semibold text-primary" : "text-muted-foreground")}>
                {formatNumber(i + 1)}. {step}
              </span>
            </li>
          ))}
        </ol>

        <section className={cn(PANEL, "flex flex-col gap-4 p-5")}>
          <div className="flex flex-col gap-2.5">
            <h2 className="text-lg font-semibold tracking-tight">ফাইল আপলোড করুন</h2>
            <div className="flex flex-wrap gap-1.5">
              {shop.papers.flatMap((p) => {
                const size = shop.papers.length > 1 ? `${PAPER_SIZE_LABELS[p.size]} ` : ""
                return [
                  <span key={`${p.size}-bw`} className="rounded-full bg-foreground/[0.06] px-2.5 py-1 text-xs font-medium">
                    {size}সাদা-কালো {formatTaka(p.bw)}/পৃষ্ঠা
                  </span>,
                  shop.hasColor && (
                    <span key={`${p.size}-color`} className="rounded-full bg-foreground/[0.06] px-2.5 py-1 text-xs font-medium">
                      {size}রঙিন {formatTaka(p.color)}/পৃষ্ঠা
                    </span>
                  ),
                ]
              })}
            </div>
          </div>

          {!shop.online && (
            <Note icon={TriangleAlertIcon} tone="amber">
              <span className="font-semibold">প্রিন্টার এখন অফলাইন।</span> অর্ডার দিলে প্রিন্টার চালু হলেই প্রিন্ট শুরু হবে।{" "}
              {formatNumber(QUEUE_EXPIRY_HOURS)} ঘণ্টার মধ্যে প্রিন্ট না হলে অর্ডারটি স্বয়ংক্রিয়ভাবে বাতিল হবে।
            </Note>
          )}

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            {...dropHandlers}
            className={cn(
              "flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-primary/25 bg-primary/[0.03] px-6 py-10 text-center transition outline-none hover:bg-primary/[0.06] focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.99]",
              dragging && "border-primary bg-primary/[0.08]"
            )}
          >
            <span className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25">
              <UploadIcon className="size-6" />
            </span>
            <span className="text-base font-semibold">PDF ফাইল নির্বাচন করুন</span>
            <span className="text-sm text-muted-foreground">
              একসাথে একাধিক ফাইল দেওয়া যাবে · প্রতিটি সর্বোচ্চ {formatNumber(maxUploadMb)} MB
            </span>
          </button>
          <Button className={cn(TOOL_BUTTON, TINTED)} onClick={() => imageInputRef.current?.click()}>
            <ImageIcon /> Print Photos (JPG, PNG)
          </Button>
          {fileInputs}
        </section>

        {counterNote}
        {tools(false)}
      </>
    )
  }

  return (
    <div className="flex flex-col gap-4" {...dropHandlers}>
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
        <div className="grid grid-cols-2 gap-3">
          <Button
            className={cn(TOOL_BUTTON, TINTED, dragging && "ring-2 ring-primary")}
            disabled={!!paying}
            onClick={() => inputRef.current?.click()}
          >
            <FilePlusIcon /> Add PDF
          </Button>
          <Button
            className={cn(TOOL_BUTTON, TINTED, dragging && "ring-2 ring-primary")}
            disabled={!!paying}
            onClick={() => imageInputRef.current?.click()}
          >
            <ImagePlusIcon /> Add Photo
          </Button>
        </div>
      )}
      {fileInputs}
      {items.length < MAX_FILES_PER_ORDER && tools(true)}
      {counterNote}

      <section ref={paymentRef} className={cn(PANEL, "flex scroll-mt-4 flex-col gap-4 p-5")}>
        <h2 className="text-lg font-semibold tracking-tight">পেমেন্ট</h2>
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-sm text-muted-foreground">সর্বমোট</div>
            <div className="text-3xl font-bold tracking-tight tabular-nums">{formatTaka(total)}</div>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            {formatNumber(ready.length)}টি ফাইল · {formatNumber(pages)} পৃষ্ঠা
          </div>
        </div>
        {busy && (
          <p className="rounded-xl bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200">আপলোড শেষ হলে পেমেন্ট করা যাবে।</p>
        )}
        <div className="flex flex-col gap-2.5">
          {counter ? (
            <Button className={cn(TOOL_BUTTON, "w-full")} disabled={!canPay} onClick={() => checkout("cash")}>
              {paying === "cash" ? <Spinner /> : <BanknoteIcon />} Place Order · Cash
            </Button>
          ) : (
            <>
              {shop.payments.bkash && <BkashButton label="Pay with" pending={paying === "bkash"} disabled={!canPay} onClick={() => checkout("bkash")} />}
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
            </>
          )}
        </div>
      </section>

      {/* With several files the payment card is far down; keep the total in reach. */}
      {!paymentVisible && ready.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/80 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl">
          <div className="mx-auto flex max-w-md items-center justify-between gap-3">
            <div>
              <div className="text-xs text-muted-foreground">সর্বমোট</div>
              <div className="text-xl font-bold tracking-tight tabular-nums">{formatTaka(total)}</div>
            </div>
            <Button className="h-11 rounded-xl px-5 text-base font-semibold" onClick={scrollToPayment}>
              Continue <ArrowDownIcon />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
