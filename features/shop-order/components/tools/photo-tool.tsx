"use client"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { formatNumber, formatTaka } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { BACKGROUNDS, PHOTO_SIZES, usePhotoTool, type Background, type PhotoSize } from "../../hooks/use-photo-tool"
import { A4_MM, photoPositions } from "../../lib/layout-pdf"
import { ChoiceRow } from "./choice-row"
import { CropEditor } from "./crop-editor"
import { ImagePicker } from "./image-picker"
import { SheetPreview, TOOL_BUTTON, ToolDialog, ToolHint } from "./tool-dialog"

const BACKGROUND_LABELS: Record<Background, string> = { keep: "আসল", white: "সাদা", blue: "হালকা নীল" }

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
      description={`সামনের দিকে তাকানো একটি ছবি দিন। প্রতি পাতা ${formatTaka(sheetPrice)}।`}
      footer={
        <Button className={cn(TOOL_BUTTON, "w-full")} disabled={!t.image || t.processing || t.building} onClick={t.finish}>
          {t.building && <Spinner />} Add to Order
        </Button>
      }
    >
      {!t.image || !t.view ? (
        <>
          <ToolHint>হালকা রঙের দেয়ালের সামনে, পর্যাপ্ত আলোতে ছবি তুলুন। মুখ যেন স্পষ্ট দেখা যায়।</ToolHint>
          <ImagePicker disabled={t.loading} onPick={(files) => t.pick(files[0])} />
          {t.loading && (
            <ToolHint className="flex items-center gap-2">
              <Spinner /> ছবি প্রস্তুত হচ্ছে…
            </ToolHint>
          )}
        </>
      ) : (
        <>
          <ChoiceRow<PhotoSize>
            label="ছবির মাপ"
            value={t.size}
            onChange={t.setSize}
            options={(Object.keys(PHOTO_SIZES) as PhotoSize[]).map((key) => ({ value: key, label: PHOTO_SIZES[key].label }))}
          />
          <div className="flex flex-col gap-2">
            <div className="relative">
              <CropEditor image={t.image} aspect={t.aspect} view={t.view} onChange={t.setView} guide="face" />
              {t.processing && (
                <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-xl bg-background/75 text-sm font-medium backdrop-blur-sm">
                  <Spinner /> ব্যাকগ্রাউন্ড পরিবর্তন হচ্ছে…
                </div>
              )}
            </div>
            <ToolHint className="text-center text-xs">ছবি টেনে মুখটি দাগের ভেতরে রাখুন। স্লাইডার দিয়ে জুম করুন।</ToolHint>
          </div>
          <ChoiceRow<Background>
            label="ব্যাকগ্রাউন্ড"
            value={t.background}
            onChange={t.setBackground}
            options={(Object.keys(BACKGROUNDS) as Background[]).map((key) => ({ value: key, label: BACKGROUND_LABELS[key], disabled: t.processing }))}
          />
          <ChoiceRow<number>
            label="ছবির সংখ্যা"
            value={t.count}
            onChange={t.setCount}
            options={[2, 4, 6, 8, 12, 16].map((n) => ({ value: n, label: formatNumber(n), disabled: !t.fits(n, t.stamps) }))}
          />
          {t.stampsOffered && (
            <ChoiceRow<number>
              label="স্ট্যাম্প সাইজ (২০ × ২৫ মিমি)"
              value={t.stamps}
              onChange={t.setStamps}
              options={[0, 4, 8].map((n) => ({ value: n, label: n ? formatNumber(n) : "লাগবে না", disabled: !t.fits(t.count, n) }))}
            />
          )}
          <SheetPreview aspect={`${A4_MM.width} / ${A4_MM.height}`}>
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
          </SheetPreview>
          <ImagePicker compact disabled={t.loading} onPick={(files) => t.pick(files[0])} />
        </>
      )}
    </ToolDialog>
  )
}
