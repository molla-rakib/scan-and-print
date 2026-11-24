"use client"

import { useMemo } from "react"
import { CheckIcon, ChevronDownIcon, ChevronUpIcon, CropIcon, DownloadIcon, RotateCwIcon, Trash2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { formatNumber } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { MAX_SCAN_PAGES, useScanTool, type ScanPage } from "../../hooks/use-scan-tool"
import { applyLook, quadSize, warpQuad, type ImageLook } from "../../lib/imaging"
import { ChoiceRow } from "./choice-row"
import { ImagePicker } from "./image-picker"
import { QuadEditor } from "./quad-editor"
import { TINTED, TOOL_BUTTON, ToolDialog, ToolHint } from "./tool-dialog"

function PagePreview({ page, look }: { page: ScanPage; look: ImageLook }) {
  const url = useMemo(() => {
    const { width, height } = quadSize(page.quad)
    const scale = 220 / Math.max(width, height, 1)
    return applyLook(warpQuad(page.image, page.quad, width * scale, height * scale), look).toDataURL("image/jpeg", 0.8)
  }, [page, look])
  // eslint-disable-next-line @next/next/no-img-element -- local preview
  return <img src={url} alt="" className="h-20 w-auto shrink-0 rounded-md bg-white shadow-md ring-1 ring-black/5" />
}

const ICON_BUTTON = "size-9 rounded-full bg-background text-foreground/70 shadow-xs hover:bg-background hover:text-foreground"

/** Camera scan: photos of paper pages → one clean PDF, printed in this order or downloaded to the phone. */
export function ScanTool({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (open: boolean) => void; onDone: (file: File, color: boolean) => void }) {
  const t = useScanTool((file, color) => {
    onDone(file, color)
    onOpenChange(false)
  })
  const editingPage = t.pages.find((p) => p.id === t.editing)
  const blocked = !t.pages.length || !!t.editing || !!t.building

  return (
    <ToolDialog
      open={open}
      onOpenChange={onOpenChange}
      title="ডকুমেন্ট স্ক্যান"
      description="কাগজের ছবি তুলুন। ছবিগুলো সোজা ও পরিষ্কার হয়ে একটি PDF তৈরি হবে, যা প্রিন্ট বা ডাউনলোড করতে পারবেন।"
      footer={
        <div className="grid w-full grid-cols-2 gap-3">
          <Button className={cn(TOOL_BUTTON, TINTED)} disabled={blocked} onClick={() => t.finish("download")}>
            {t.building === "download" ? <Spinner /> : <DownloadIcon />} Download PDF
          </Button>
          <Button className={TOOL_BUTTON} disabled={blocked} onClick={() => t.finish("order")}>
            {t.building === "order" && <Spinner />} Add to Order
          </Button>
        </div>
      }
    >
      {editingPage ? (
        <section className="flex flex-col gap-4">
          <ToolHint>চারটি কোণ টেনে পাতার কিনারার সঙ্গে মিলিয়ে দিন।</ToolHint>
          <QuadEditor image={editingPage.image} quad={editingPage.quad} onChange={(quad) => t.setQuad(editingPage.id, quad)} />
          <div className="grid grid-cols-2 gap-3">
            <Button className={cn(TOOL_BUTTON, TINTED)} onClick={() => t.rotate(editingPage.id)}>
              <RotateCwIcon /> Rotate
            </Button>
            <Button className={TOOL_BUTTON} onClick={() => t.setEditing(null)}>
              <CheckIcon /> Done
            </Button>
          </div>
        </section>
      ) : (
        <>
          <ChoiceRow<ImageLook>
            label="ফিল্টার"
            value={t.look}
            onChange={t.setLook}
            options={[
              { value: "bw", label: "সাদা-কালো" },
              { value: "gray", label: "গ্রেস্কেল" },
              { value: "color", label: "রঙিন" },
            ]}
          />
          {t.pages.length > 0 && (
            <ol className="flex flex-col divide-y divide-border/70 overflow-hidden rounded-2xl bg-muted/70">
              {t.pages.map((page, i) => (
                <li key={page.id} className="flex items-center gap-3 p-3">
                  <PagePreview page={page} look={t.look} />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">পৃষ্ঠা {formatNumber(i + 1)}</span>
                  <div className="flex items-center gap-1.5">
                    <Button variant="ghost" size="icon" aria-label="উপরে সরান" className={ICON_BUTTON} disabled={i === 0} onClick={() => t.move(page.id, -1)}>
                      <ChevronUpIcon />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="নিচে সরান"
                      className={ICON_BUTTON}
                      disabled={i === t.pages.length - 1}
                      onClick={() => t.move(page.id, 1)}
                    >
                      <ChevronDownIcon />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="কোণ ঠিক করুন" className={ICON_BUTTON} onClick={() => t.setEditing(page.id)}>
                      <CropIcon />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="মুছে ফেলুন"
                      className={cn(ICON_BUTTON, "text-destructive hover:text-destructive")}
                      onClick={() => t.remove(page.id)}
                    >
                      <Trash2Icon />
                    </Button>
                  </div>
                </li>
              ))}
            </ol>
          )}
          {t.loading && (
            <ToolHint className="flex items-center gap-2">
              <Spinner /> ছবি প্রস্তুত হচ্ছে…
            </ToolHint>
          )}
          {t.pages.length < MAX_SCAN_PAGES && (
            <ImagePicker multiple compact={t.pages.length > 0} disabled={t.loading} onPick={t.addFiles} cameraLabel={t.pages.length ? "Add Page" : "Scan Page"} />
          )}
        </>
      )}
    </ToolDialog>
  )
}
