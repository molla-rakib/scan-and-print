"use client"

import { useMemo } from "react"
import { ArrowDownIcon, ArrowUpIcon, CheckIcon, DownloadIcon, PencilIcon, RotateCwIcon, Trash2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { formatNumber } from "@/lib/constants"
import { MAX_SCAN_PAGES, useScanTool, type ScanPage } from "../../hooks/use-scan-tool"
import { applyLook, quadSize, warpQuad, type ImageLook } from "../../lib/imaging"
import { ChoiceRow } from "./choice-row"
import { ImagePicker } from "./image-picker"
import { QuadEditor } from "./quad-editor"
import { ToolDialog } from "./tool-dialog"

function PagePreview({ page, look }: { page: ScanPage; look: ImageLook }) {
  const url = useMemo(() => {
    const { width, height } = quadSize(page.quad)
    const scale = 220 / Math.max(width, height, 1)
    return applyLook(warpQuad(page.image, page.quad, width * scale, height * scale), look).toDataURL("image/jpeg", 0.8)
  }, [page, look])
  // eslint-disable-next-line @next/next/no-img-element -- local preview
  return <img src={url} alt="" className="h-28 w-auto rounded-md border bg-white shadow-xs" />
}

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
      title="ক্যামেরা স্ক্যান"
      description="কাগজের ছবি তুলুন। ছবি সোজা ও পরিষ্কার হয়ে একটি PDF হবে: প্রিন্ট করুন বা ফোনে রাখুন।"
      footer={
        <div className="grid w-full grid-cols-2 gap-2">
          <Button variant="outline" className="h-11" disabled={blocked} onClick={() => t.finish("download")}>
            {t.building === "download" ? <Spinner /> : <DownloadIcon />} PDF ডাউনলোড
          </Button>
          <Button className="h-11" disabled={blocked} onClick={() => t.finish("order")}>
            {t.building === "order" && <Spinner />} প্রিন্টে দিন
          </Button>
        </div>
      }
    >
      {editingPage ? (
        <section className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">গোল দাগগুলো টেনে পাতার চার কোণায় বসান।</p>
          <QuadEditor image={editingPage.image} quad={editingPage.quad} onChange={(quad) => t.setQuad(editingPage.id, quad)} />
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => t.rotate(editingPage.id)}>
              <RotateCwIcon /> ঘোরান
            </Button>
            <Button onClick={() => t.setEditing(null)}>
              <CheckIcon /> ঠিক আছে
            </Button>
          </div>
        </section>
      ) : (
        <>
          <ChoiceRow<ImageLook>
            label="কেমন দেখাবে"
            value={t.look}
            onChange={t.setLook}
            options={[
              { value: "bw", label: "ফটোকপির মতো" },
              { value: "gray", label: "ধূসর" },
              { value: "color", label: "রঙিন" },
            ]}
          />
          {t.pages.length > 0 && (
            <ol className="flex flex-col gap-2">
              {t.pages.map((page, i) => (
                <li key={page.id} className="flex items-center gap-3 rounded-xl border p-2">
                  <span className="w-6 text-center text-sm font-medium text-muted-foreground">{formatNumber(i + 1)}</span>
                  <PagePreview page={page} look={t.look} />
                  <div className="ml-auto grid grid-cols-2 gap-1">
                    <Button variant="ghost" size="icon" aria-label="কোণা ঠিক করুন" onClick={() => t.setEditing(page.id)}>
                      <PencilIcon />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="বাদ দিন" className="text-destructive" onClick={() => t.remove(page.id)}>
                      <Trash2Icon />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="ওপরে নিন" disabled={i === 0} onClick={() => t.move(page.id, -1)}>
                      <ArrowUpIcon />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="নিচে নিন"
                      disabled={i === t.pages.length - 1}
                      onClick={() => t.move(page.id, 1)}
                    >
                      <ArrowDownIcon />
                    </Button>
                  </div>
                </li>
              ))}
            </ol>
          )}
          {t.loading && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner /> ছবি খোলা হচ্ছে…
            </p>
          )}
          {t.pages.length < MAX_SCAN_PAGES && (
            <ImagePicker
              multiple
              disabled={t.loading}
              onPick={t.addFiles}
              cameraLabel={t.pages.length ? "আরও পৃষ্ঠা তুলুন" : "ক্যামেরায় ছবি তুলুন"}
            />
          )}
        </>
      )}
    </ToolDialog>
  )
}
