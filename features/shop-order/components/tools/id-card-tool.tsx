"use client"

import { useMemo } from "react"
import { CheckIcon, CropIcon, RotateCwIcon, Trash2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { formatNumber } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { CARD_TYPES, useIdCardTool, type CardSide, type CardType } from "../../hooks/use-id-card-tool"
import { applyLook, warpQuad, type ImageLook } from "../../lib/imaging"
import { A4_MM, cardPositions } from "../../lib/layout-pdf"
import { ChoiceRow } from "./choice-row"
import { ImagePicker } from "./image-picker"
import { QuadEditor } from "./quad-editor"
import { FIELD_LABEL, SheetPreview, TINTED, TOOL_BUTTON, ToolCard, ToolDialog, ToolHint } from "./tool-dialog"

const STAMPS = ["শুধুমাত্র ব্যাংক হিসাবের জন্য", "শুধুমাত্র সিম রেজিস্ট্রেশনের জন্য", "শুধুমাত্র চাকরির আবেদনের জন্য"]

/** Small straightened preview of one side, redrawn when its corners or the look change. */
function SidePreview({ side, look, widthMm, heightMm }: { side: CardSide; look: ImageLook; widthMm: number; heightMm: number }) {
  const url = useMemo(() => {
    const width = 320
    return applyLook(warpQuad(side.image, side.quad, width, (width * heightMm) / widthMm), look).toDataURL("image/jpeg", 0.85)
  }, [side, look, widthMm, heightMm])
  // eslint-disable-next-line @next/next/no-img-element -- local preview
  return <img src={url} alt="" className="w-36 rounded-lg shadow-md ring-1 ring-black/5" />
}

function SideSection({
  title,
  optional,
  side,
  editing,
  look,
  widthMm,
  heightMm,
  loading,
  onPick,
  onEdit,
  onDoneEditing,
  onQuad,
  onRotate,
  onRemove,
}: {
  title: string
  optional?: boolean
  side: CardSide | null
  editing: boolean
  look: ImageLook
  widthMm: number
  heightMm: number
  loading: boolean
  onPick: (file: File) => void
  onEdit: () => void
  onDoneEditing: () => void
  onQuad: (quad: CardSide["quad"]) => void
  onRotate: () => void
  onRemove?: () => void
}) {
  return (
    <ToolCard title={title} badge={optional ? "ঐচ্ছিক" : undefined}>
      {!side ? (
        <ImagePicker disabled={loading} onPick={(files) => onPick(files[0])} />
      ) : editing ? (
        <>
          <ToolHint>চারটি কোণ টেনে কার্ডের কিনারার সঙ্গে মিলিয়ে দিন।</ToolHint>
          <QuadEditor image={side.image} quad={side.quad} onChange={onQuad} />
          <div className="grid grid-cols-2 gap-3">
            <Button className={cn(TOOL_BUTTON, TINTED)} onClick={onRotate}>
              <RotateCwIcon /> Rotate
            </Button>
            <Button className={TOOL_BUTTON} onClick={onDoneEditing}>
              <CheckIcon /> Done
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-4">
            <SidePreview side={side} look={look} widthMm={widthMm} heightMm={heightMm} />
            <div className="flex flex-col gap-2">
              <Button size="sm" className={cn("rounded-full font-semibold", TINTED)} onClick={onEdit}>
                <CropIcon /> Adjust
              </Button>
              {onRemove && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-full font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={onRemove}
                >
                  <Trash2Icon /> Remove
                </Button>
              )}
            </div>
          </div>
          <ImagePicker compact disabled={loading} onPick={(files) => onPick(files[0])} />
        </>
      )}
    </ToolCard>
  )
}

/** NID / ID card copy: both sides of a card on one A4 at true size, several copies per sheet. */
export function IdCardTool({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (open: boolean) => void; onDone: (file: File, color: boolean) => void }) {
  const t = useIdCardTool((file, color) => {
    onDone(file, color)
    onOpenChange(false)
  })
  const layout = cardPositions({ ...t.size, sets: t.sets, scale: t.scale }, !!t.back)
  const setOptions = [1, 2, 3, 4, 6, 8].filter((n) => n <= t.maxSets)

  return (
    <ToolDialog
      open={open}
      onOpenChange={onOpenChange}
      title="NID / আইডি কার্ড কপি"
      description="কার্ডের দুই পাশের ছবি দিন। আসল মাপে এক পাতায় প্রিন্ট হবে।"
      footer={
        <Button className={cn(TOOL_BUTTON, "w-full")} disabled={!t.front || !!t.editing || t.building || t.maxSets < 1} onClick={t.finish}>
          {t.building && <Spinner />} Add to Order
        </Button>
      }
    >
      <ChoiceRow<CardType>
        label="কার্ডের ধরন"
        value={t.cardType}
        onChange={t.setCardType}
        options={(Object.keys(CARD_TYPES) as CardType[]).map((key) => ({ value: key, label: CARD_TYPES[key].label }))}
      />
      {t.cardType === "custom" && (
        <div className="grid grid-cols-2 gap-3">
          {(["width", "height"] as const).map((dim) => (
            <label key={dim} className="flex flex-col gap-1.5">
              <span className={FIELD_LABEL}>{dim === "width" ? "প্রস্থ (মিমি)" : "উচ্চতা (মিমি)"}</span>
              <Input
                type="number"
                min={20}
                max={180}
                className="h-11 rounded-xl"
                value={t.customMm[dim]}
                onChange={(e) => t.setCustomMm({ ...t.customMm, [dim]: Math.min(180, Math.max(20, Number(e.target.value) || 20)) })}
              />
            </label>
          ))}
        </div>
      )}

      {t.loading && (
        <ToolHint className="flex items-center gap-2">
          <Spinner /> ছবি প্রস্তুত হচ্ছে…
        </ToolHint>
      )}

      <SideSection
        title="সামনের পাশ"
        side={t.front}
        editing={t.editing === "front"}
        look={t.look}
        widthMm={t.size.widthMm}
        heightMm={t.size.heightMm}
        loading={t.loading}
        onPick={(file) => t.pick("front", file)}
        onEdit={() => t.setEditing("front")}
        onDoneEditing={() => t.setEditing(null)}
        onQuad={(quad) => t.setQuad("front", quad)}
        onRotate={() => t.rotate("front")}
      />
      {t.front && (
        <SideSection
          title="পেছনের পাশ"
          optional
          side={t.back}
          editing={t.editing === "back"}
          look={t.look}
          widthMm={t.size.widthMm}
          heightMm={t.size.heightMm}
          loading={t.loading}
          onPick={(file) => t.pick("back", file)}
          onEdit={() => t.setEditing("back")}
          onDoneEditing={() => t.setEditing(null)}
          onQuad={(quad) => t.setQuad("back", quad)}
          onRotate={() => t.rotate("back")}
          onRemove={t.removeBack}
        />
      )}

      {t.front && !t.editing && (
        <>
          <ChoiceRow<ImageLook>
            label="প্রিন্টের ধরন"
            value={t.look}
            onChange={t.setLook}
            options={[
              { value: "color", label: "রঙিন" },
              { value: "gray", label: "গ্রেস্কেল" },
              { value: "bw", label: "সাদা-কালো" },
            ]}
          />
          <ChoiceRow<1 | 1.5>
            label="আকার"
            value={t.scale}
            onChange={t.setScale}
            options={[
              { value: 1, label: "আসল মাপ" },
              { value: 1.5, label: "১.৫ গুণ বড়", disabled: !t.largeFits },
            ]}
          />
          {t.maxSets < 1 && (
            <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">এই মাপের কার্ড A4 পাতায় ধরছে না। আকার ছোট করে দেখুন।</p>
          )}
          <ChoiceRow<number>
            label="প্রতি পাতায় কপি"
            value={t.sets}
            onChange={t.setSets}
            options={setOptions.map((n) => ({ value: n, label: formatNumber(n) }))}
          />
          <div className="flex flex-col gap-2">
            <label htmlFor="stamp" className={FIELD_LABEL}>
              জলছাপ (ঐচ্ছিক)
            </label>
            <Input
              id="stamp"
              className="h-11 rounded-xl"
              value={t.stamp}
              maxLength={60}
              placeholder="যেমন: শুধুমাত্র ব্যাংক হিসাবের জন্য"
              onChange={(e) => t.setStamp(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              {STAMPS.map((text) => (
                <button
                  key={text}
                  type="button"
                  onClick={() => t.setStamp(text)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    t.stamp === text ? "bg-primary/10 text-primary" : "bg-foreground/[0.06] text-foreground/75 hover:bg-foreground/10"
                  )}
                >
                  {text}
                </button>
              ))}
            </div>
            <ToolHint className="px-0.5 text-xs">অপব্যবহার রোধে লেখাটি কার্ডের ওপর হালকা করে ছাপা হবে।</ToolHint>
          </div>

          <SheetPreview aspect={`${A4_MM.width} / ${A4_MM.height}`}>
            {layout.cards.map((card, i) => (
              <span
                key={i}
                className={card.side === "front" ? "absolute rounded-[2px] bg-primary/70" : "absolute rounded-[2px] bg-primary/35"}
                style={{
                  left: `${(card.x / A4_MM.width) * 100}%`,
                  top: `${(card.y / A4_MM.height) * 100}%`,
                  width: `${(layout.width / A4_MM.width) * 100}%`,
                  height: `${(layout.height / A4_MM.height) * 100}%`,
                }}
              />
            ))}
          </SheetPreview>
        </>
      )}
    </ToolDialog>
  )
}
