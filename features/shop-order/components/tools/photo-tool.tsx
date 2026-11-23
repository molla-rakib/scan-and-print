"use client"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { formatNumber, formatTaka } from "@/lib/constants"
import { BACKGROUNDS, PHOTO_SIZES, usePhotoTool, type Background, type PhotoSize } from "../../hooks/use-photo-tool"
import { A4_MM, photoPositions } from "../../lib/layout-pdf"
import { ChoiceRow } from "./choice-row"
import { CropEditor } from "./crop-editor"
import { ImagePicker } from "./image-picker"
import { ToolDialog } from "./tool-dialog"

const BACKGROUND_LABELS: Record<Background, string> = { keep: "যেমন আছে", white: "সাদা", blue: "হালকা নীল" }

/** Passport / stamp photos: one photo cropped to size and laid out on an A4 sheet at the shop's photo price. */
export function PhotoTool({
  open,
  onOpenChange,
  onDone,
  sheetPrice,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDone: (file: File) => void
  sheetPrice: number
}) {
  const t = usePhotoTool((file) => {
    onDone(file)
    onOpenChange(false)
  })
  const positions = photoPositions(t.groups) ?? []

  return (
    <ToolDialog
      open={open}
      onOpenChange={onOpenChange}
      title="পাসপোর্ট ছবি"
      description={`সামনে তাকানো একটি ছবি দিন। এক পাতা ছবি ${formatTaka(sheetPrice)}।`}
      footer={
        <Button className="h-11 w-full" disabled={!t.image || t.processing || t.building} onClick={t.finish}>
          {t.building && <Spinner />} অর্ডারে যোগ করুন
        </Button>
      }
    >
      {!t.image || !t.view ? (
        <>
          <p className="text-sm text-muted-foreground">হালকা রঙের দেয়ালের সামনে দাঁড়িয়ে ছবি তুলুন। মুখ যেন পরিষ্কার দেখা যায়।</p>
          <ImagePicker disabled={t.loading} onPick={(files) => t.pick(files[0])} />
          {t.loading && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner /> ছবি খোলা হচ্ছে…
            </p>
          )}
        </>
      ) : (
        <>
          <ChoiceRow<PhotoSize>
            label="মাপ"
            value={t.size}
            onChange={t.setSize}
            options={(Object.keys(PHOTO_SIZES) as PhotoSize[]).map((key) => ({ value: key, label: PHOTO_SIZES[key].label }))}
          />
          <div className="relative">
            <CropEditor image={t.image} aspect={t.aspect} view={t.view} onChange={t.setView} guide="face" />
            {t.processing && (
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-background/70 text-sm font-medium">
                <Spinner /> ব্যাকগ্রাউন্ড বদলানো হচ্ছে…
              </div>
            )}
          </div>
          <p className="text-center text-xs text-muted-foreground">ছবি টেনে মুখ দাগের ভেতরে আনুন।</p>
          <ChoiceRow<Background>
            label="ব্যাকগ্রাউন্ড"
            value={t.background}
            onChange={t.setBackground}
            options={(Object.keys(BACKGROUNDS) as Background[]).map((key) => ({ value: key, label: BACKGROUND_LABELS[key], disabled: t.processing }))}
          />
          <ChoiceRow<number>
            label="কয়টি ছবি"
            value={t.count}
            onChange={t.setCount}
            options={[2, 4, 6, 8, 12, 16].map((n) => ({ value: n, label: formatNumber(n), disabled: !t.fits(n, t.stamps) }))}
          />
          {t.stampsOffered && (
            <ChoiceRow<number>
              label="স্ট্যাম্প সাইজ ছবি (২০ × ২৫ মিমি)"
              value={t.stamps}
              onChange={t.setStamps}
              options={[0, 4, 8].map((n) => ({ value: n, label: n ? formatNumber(n) : "লাগবে না", disabled: !t.fits(t.count, n) }))}
            />
          )}
          <div className="flex flex-col items-center gap-2">
            <span className="text-sm font-medium">পাতায় যেভাবে বসবে</span>
            <div className="relative w-40 border bg-white shadow-sm" style={{ aspectRatio: `${A4_MM.width} / ${A4_MM.height}` }}>
              {positions.map((p, i) => {
                const g = t.groups[p.group]
                return (
                  <span
                    key={i}
                    className="absolute rounded-[1px] bg-primary/60"
                    style={{
                      left: `${(p.x / A4_MM.width) * 100}%`,
                      top: `${(p.y / A4_MM.height) * 100}%`,
                      width: `${(g.widthMm / A4_MM.width) * 100}%`,
                      height: `${(g.heightMm / A4_MM.height) * 100}%`,
                    }}
                  />
                )
              })}
            </div>
          </div>
          <ImagePicker disabled={t.loading} onPick={(files) => t.pick(files[0])} cameraLabel="আবার তুলুন" />
        </>
      )}
    </ToolDialog>
  )
}
