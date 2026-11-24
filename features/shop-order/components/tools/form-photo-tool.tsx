"use client"

import { CheckCircle2Icon, CropIcon, DownloadIcon, WandSparklesIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { formatNumber } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { FORM_PRESETS, useFormPhotoTool, type FormPreset, type FormResult, type ImageRule } from "../../hooks/use-form-photo-tool"
import { ChoiceRow } from "./choice-row"
import { CropEditor } from "./crop-editor"
import { ImagePicker } from "./image-picker"
import { QuadEditor } from "./quad-editor"
import { FIELD_LABEL, TINTED, TOOL_BUTTON, ToolCard, ToolDialog, ToolHint } from "./tool-dialog"

function RuleFields({ rule, onChange }: { rule: ImageRule; onChange: (rule: ImageRule) => void }) {
  const field = (key: keyof ImageRule, label: string, max: number) => (
    <label className="flex flex-col gap-1.5">
      <span className={cn(FIELD_LABEL, "text-xs")}>{label}</span>
      <Input
        type="number"
        min={10}
        max={max}
        className="h-11 rounded-xl bg-background"
        value={rule[key]}
        onChange={(e) => onChange({ ...rule, [key]: Math.min(max, Math.max(10, Number(e.target.value) || 10)) })}
      />
    </label>
  )
  return (
    <div className="grid grid-cols-3 gap-2">
      {field("width", "প্রস্থ (px)", 2000)}
      {field("height", "উচ্চতা (px)", 2000)}
      {field("kb", "সর্বোচ্চ (KB)", 5000)}
    </div>
  )
}

function Result({ result, rule, onDownload }: { result: FormResult; rule: ImageRule; onDownload: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-background p-3 shadow-xs ring-1 ring-foreground/5">
      {/* eslint-disable-next-line @next/next/no-img-element -- local result */}
      <img src={result.url} alt="" className="max-h-16 max-w-28 rounded-md bg-white ring-1 ring-black/5" />
      <div className="min-w-0 flex-1 text-sm">
        <div className="flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
          <CheckCircle2Icon className="size-4" /> প্রস্তুত
        </div>
        <div className="text-xs text-muted-foreground">
          {formatNumber(rule.width)} × {formatNumber(rule.height)} px · {formatNumber(Math.ceil(result.blob.size / 1024))} KB
        </div>
      </div>
      <Button size="sm" className="rounded-full font-semibold" onClick={onDownload}>
        <DownloadIcon /> Download
      </Button>
    </div>
  )
}

/** Photo and signature for online job and admission forms, at the form's exact size; free to download. */
export function FormPhotoTool({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useFormPhotoTool()

  return (
    <ToolDialog
      open={open}
      onOpenChange={onOpenChange}
      title="ফর্মের ছবি ও স্বাক্ষর"
      description="চাকরি বা ভর্তির অনলাইন আবেদনের নির্ধারিত মাপে ছবি ও স্বাক্ষর তৈরি করে ডাউনলোড করুন। সম্পূর্ণ বিনামূল্যে।"
    >
      <div className="flex flex-col gap-2">
        <ChoiceRow<FormPreset>
          label="আবেদনের ধরন"
          value={t.preset}
          onChange={t.setPreset}
          options={(Object.keys(FORM_PRESETS) as FormPreset[]).map((key) => ({ value: key, label: FORM_PRESETS[key].label }))}
        />
        <ToolHint className="px-0.5 text-xs">বিজ্ঞপ্তিতে ভিন্ন মাপ দেওয়া থাকলে নিচের ঘরে তা লিখে দিন।</ToolHint>
      </div>

      <ToolCard title="ছবি">
        <RuleFields rule={t.photoRule} onChange={t.setPhotoRule} />
        {t.photo ? (
          <>
            <div className="relative">
              <CropEditor
                image={t.photo.image}
                aspect={t.photoRule.width / t.photoRule.height}
                view={t.photo.view}
                onChange={t.setPhotoView}
                guide="face"
              />
              {t.busy === "white" && (
                <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-xl bg-background/75 text-sm font-medium backdrop-blur-sm">
                  <Spinner /> ব্যাকগ্রাউন্ড সাদা করা হচ্ছে…
                </div>
              )}
            </div>
            <ChoiceRow<string>
              label="ব্যাকগ্রাউন্ড"
              value={t.photo.white ? "white" : "keep"}
              onChange={(value) => t.setWhite(value === "white")}
              options={[
                { value: "keep", label: "আসল" },
                { value: "white", label: "সাদা" },
              ]}
            />
            <Button className={TOOL_BUTTON} onClick={t.makePhoto} disabled={!!t.busy}>
              {t.busy === "photo" ? <Spinner /> : <WandSparklesIcon />} Create Photo
            </Button>
            {t.results.photo && <Result result={t.results.photo} rule={t.photoRule} onDownload={() => t.download("photo")} />}
          </>
        ) : null}
        <ImagePicker compact={!!t.photo} onPick={(files) => t.pickPhoto(files[0])} />
      </ToolCard>

      <ToolCard title="স্বাক্ষর">
        <ToolHint>সাদা কাগজে কালো বা নীল কলমে স্বাক্ষর করে ছবি তুলুন।</ToolHint>
        <RuleFields rule={t.signRule} onChange={t.setSignRule} />
        {t.sign && t.editingSign && (
          <>
            <ToolHint>চারটি কোণ টেনে স্বাক্ষরের চারপাশে মিলিয়ে দিন।</ToolHint>
            <QuadEditor image={t.sign.image} quad={t.sign.quad} onChange={t.setSignQuad} />
            <Button className={TOOL_BUTTON} onClick={t.makeSign} disabled={!!t.busy}>
              {t.busy === "sign" ? <Spinner /> : <WandSparklesIcon />} Create Signature
            </Button>
          </>
        )}
        {t.results.sign && !t.editingSign && (
          <>
            <Result result={t.results.sign} rule={t.signRule} onDownload={() => t.download("sign")} />
            <Button className={cn("h-11 rounded-xl font-semibold", TINTED)} onClick={() => t.setEditingSign(true)}>
              <CropIcon /> Adjust
            </Button>
          </>
        )}
        <ImagePicker compact={!!t.sign} onPick={(files) => t.pickSign(files[0])} />
      </ToolCard>
    </ToolDialog>
  )
}
