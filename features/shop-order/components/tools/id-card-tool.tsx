"use client"

import { useMemo } from "react"
import { CheckIcon, PencilIcon, RotateCwIcon, Trash2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { formatNumber } from "@/lib/constants"
import { CARD_TYPES, useIdCardTool, type CardSide, type CardType } from "../../hooks/use-id-card-tool"
import { applyLook, warpQuad, type ImageLook } from "../../lib/imaging"
import { A4_MM, cardPositions } from "../../lib/layout-pdf"
import { ChoiceRow } from "./choice-row"
import { ImagePicker } from "./image-picker"
import { QuadEditor } from "./quad-editor"
import { ToolDialog } from "./tool-dialog"

const STAMPS = ["শুধুমাত্র ব্যাংক হিসাবের জন্য", "শুধুমাত্র সিম রেজিস্ট্রেশনের জন্য", "শুধুমাত্র চাকরির আবেদনের জন্য"]

/** Small straightened preview of one side, redrawn when its corners or the look change. */
function SidePreview({ side, look, widthMm, heightMm }: { side: CardSide; look: ImageLook; widthMm: number; heightMm: number }) {
  const url = useMemo(() => {
    const width = 320
    return applyLook(warpQuad(side.image, side.quad, width, (width * heightMm) / widthMm), look).toDataURL("image/jpeg", 0.85)
  }, [side, look, widthMm, heightMm])
  // eslint-disable-next-line @next/next/no-img-element -- local preview
  return <img src={url} alt="" className="w-40 rounded-md border shadow-xs" />
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
    <section className="flex flex-col gap-3 rounded-xl border p-3">
      <h3 className="font-medium">
        {title} {optional && <span className="text-sm font-normal text-muted-foreground">(না থাকলে বাদ দিন)</span>}
      </h3>
      {!side ? (
        <ImagePicker disabled={loading} onPick={(files) => onPick(files[0])} />
      ) : editing ? (
        <>
          <p className="text-sm text-muted-foreground">গোল দাগগুলো টেনে কার্ডের চার কোণায় বসান।</p>
          <QuadEditor image={side.image} quad={side.quad} onChange={onQuad} />
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={onRotate}>
              <RotateCwIcon /> ঘোরান
            </Button>
            <Button onClick={onDoneEditing}>
              <CheckIcon /> ঠিক আছে
            </Button>
          </div>
        </>
      ) : (
        <div className="flex items-center gap-3">
          <SidePreview side={side} look={look} widthMm={widthMm} heightMm={heightMm} />
          <div className="flex flex-col gap-2">
            <Button variant="outline" size="sm" onClick={onEdit}>
              <PencilIcon /> কোণা ঠিক করুন
            </Button>
            {onRemove && (
              <Button variant="ghost" size="sm" className="text-destructive" onClick={onRemove}>
                <Trash2Icon /> বাদ দিন
              </Button>
            )}
          </div>
        </div>
      )}
      {side && !editing && <ImagePicker disabled={loading} onPick={(files) => onPick(files[0])} cameraLabel="আবার তুলুন" />}
    </section>
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
      description="কার্ডের ছবি দিন: সামনে ও পেছনে। আসল মাপে এক পাতায় প্রিন্ট হবে।"
      footer={
        <Button className="h-11 w-full" disabled={!t.front || !!t.editing || t.building} onClick={t.finish}>
          {t.building && <Spinner />} অর্ডারে যোগ করুন
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
        <div className="grid grid-cols-2 gap-2">
          {(["width", "height"] as const).map((dim) => (
            <label key={dim} className="flex flex-col gap-1 text-sm">
              {dim === "width" ? "চওড়া (মিমি)" : "উচ্চতা (মিমি)"}
              <Input
                type="number"
                min={20}
                max={180}
                value={t.customMm[dim]}
                onChange={(e) => t.setCustomMm({ ...t.customMm, [dim]: Math.min(180, Math.max(20, Number(e.target.value) || 20)) })}
              />
            </label>
          ))}
        </div>
      )}

      {t.loading && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner /> ছবি খোলা হচ্ছে…
        </p>
      )}

      <SideSection
        title="সামনের দিক"
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
          title="পেছনের দিক"
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
            label="কেমন দেখাবে"
            value={t.look}
            onChange={t.setLook}
            options={[
              { value: "color", label: "রঙিন" },
              { value: "gray", label: "ধূসর" },
              { value: "bw", label: "ফটোকপির মতো" },
            ]}
          />
          <ChoiceRow<1 | 1.5>
            label="মাপ"
            value={t.scale}
            onChange={t.setScale}
            options={[
              { value: 1, label: "আসল মাপ" },
              { value: 1.5, label: "বড় করে (১.৫ গুণ)" },
            ]}
          />
          <ChoiceRow<number>
            label="এক পাতায় কয় কপি"
            value={t.sets}
            onChange={t.setSets}
            options={setOptions.map((n) => ({ value: n, label: formatNumber(n) }))}
          />
          <div className="flex flex-col gap-2">
            <label htmlFor="stamp" className="text-sm font-medium">
              কার্ডের ওপর লেখা (ঐচ্ছিক)
            </label>
            <Input id="stamp" value={t.stamp} maxLength={60} placeholder="যেমন: শুধুমাত্র ব্যাংক হিসাবের জন্য" onChange={(e) => t.setStamp(e.target.value)} />
            <div className="flex flex-wrap gap-1.5">
              {STAMPS.map((text) => (
                <button
                  key={text}
                  type="button"
                  onClick={() => t.setStamp(text)}
                  className="rounded-full border px-2.5 py-1 text-xs hover:bg-muted"
                >
                  {text}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">কপির অপব্যবহার ঠেকাতে কাজের নাম হালকা করে লেখা থাকবে।</p>
          </div>

          <div className="flex flex-col items-center gap-2">
            <span className="text-sm font-medium">পাতায় যেভাবে বসবে</span>
            <div className="relative w-40 border bg-white shadow-sm" style={{ aspectRatio: `${A4_MM.width} / ${A4_MM.height}` }}>
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
            </div>
          </div>
        </>
      )}
    </ToolDialog>
  )
}
