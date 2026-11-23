"use client"

import { CheckIcon, DownloadIcon, WandSparklesIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { formatNumber } from "@/lib/constants"
import { FORM_PRESETS, useFormPhotoTool, type FormPreset, type FormResult, type ImageRule } from "../../hooks/use-form-photo-tool"
import { ChoiceRow } from "./choice-row"
import { CropEditor } from "./crop-editor"
import { ImagePicker } from "./image-picker"
import { QuadEditor } from "./quad-editor"
import { ToolDialog } from "./tool-dialog"

function RuleFields({ rule, onChange }: { rule: ImageRule; onChange: (rule: ImageRule) => void }) {
  const field = (key: keyof ImageRule, label: string, max: number) => (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
      {label}
      <Input
        type="number"
        min={10}
        max={max}
        value={rule[key]}
        onChange={(e) => onChange({ ...rule, [key]: Math.min(max, Math.max(10, Number(e.target.value) || 10)) })}
      />
    </label>
  )
  return (
    <div className="grid grid-cols-3 gap-2">
      {field("width", "চওড়া (পিক্সেল)", 2000)}
      {field("height", "উচ্চতা (পিক্সেল)", 2000)}
      {field("kb", "সর্বোচ্চ KB", 5000)}
    </div>
  )
}

function Result({ result, rule, onDownload }: { result: FormResult; rule: ImageRule; onDownload: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-emerald-500/10 p-3">
      {/* eslint-disable-next-line @next/next/no-img-element -- local result */}
      <img src={result.url} alt="" className="max-h-20 max-w-32 rounded border bg-white" />
      <div className="min-w-0 flex-1 text-sm">
        <div className="font-medium text-emerald-800 dark:text-emerald-300">
          <CheckIcon className="inline size-4" /> তৈরি
        </div>
        <div className="text-xs text-muted-foreground">
          {formatNumber(rule.width)} × {formatNumber(rule.height)} · {formatNumber(Math.ceil(result.blob.size / 1024))} KB
        </div>
      </div>
      <Button size="sm" onClick={onDownload}>
        <DownloadIcon /> ডাউনলোড
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
      description="চাকরি বা ভর্তির অনলাইন ফর্মের মাপে ছবি ও স্বাক্ষর তৈরি করে ফোনে ডাউনলোড করুন। বিনামূল্যে।"
    >
      <ChoiceRow<FormPreset>
        label="কোন ফর্ম"
        value={t.preset}
        onChange={t.setPreset}
        options={(Object.keys(FORM_PRESETS) as FormPreset[]).map((key) => ({ value: key, label: FORM_PRESETS[key].label }))}
      />
      <p className="text-xs text-muted-foreground">বিজ্ঞপ্তিতে মাপ আলাদা লেখা থাকলে নিচের ঘরে সেটি বসান।</p>

      <section className="flex flex-col gap-3 rounded-xl border p-3">
        <h3 className="font-medium">ছবি</h3>
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
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-background/70 text-sm font-medium">
                  <Spinner /> ব্যাকগ্রাউন্ড সাদা করা হচ্ছে…
                </div>
              )}
            </div>
            <ChoiceRow<string>
              label="ব্যাকগ্রাউন্ড"
              value={t.photo.white ? "white" : "keep"}
              onChange={(value) => t.setWhite(value === "white")}
              options={[
                { value: "keep", label: "যেমন আছে" },
                { value: "white", label: "সাদা" },
              ]}
            />
            <Button onClick={t.makePhoto} disabled={!!t.busy}>
              {t.busy === "photo" ? <Spinner /> : <WandSparklesIcon />} ছবি তৈরি করুন
            </Button>
            {t.results.photo && <Result result={t.results.photo} rule={t.photoRule} onDownload={() => t.download("photo")} />}
          </>
        ) : null}
        <ImagePicker onPick={(files) => t.pickPhoto(files[0])} cameraLabel={t.photo ? "আবার তুলুন" : "ছবি তুলুন"} />
      </section>

      <section className="flex flex-col gap-3 rounded-xl border p-3">
        <h3 className="font-medium">স্বাক্ষর</h3>
        <p className="text-xs text-muted-foreground">সাদা কাগজে কালো বা নীল কলমে স্বাক্ষর করে ছবি তুলুন।</p>
        <RuleFields rule={t.signRule} onChange={t.setSignRule} />
        {t.sign && t.editingSign && (
          <>
            <p className="text-sm text-muted-foreground">দাগগুলো টেনে স্বাক্ষরের চারপাশে বসান।</p>
            <QuadEditor image={t.sign.image} quad={t.sign.quad} onChange={t.setSignQuad} />
            <Button onClick={t.makeSign} disabled={!!t.busy}>
              {t.busy === "sign" ? <Spinner /> : <WandSparklesIcon />} স্বাক্ষর তৈরি করুন
            </Button>
          </>
        )}
        {t.results.sign && !t.editingSign && (
          <>
            <Result result={t.results.sign} rule={t.signRule} onDownload={() => t.download("sign")} />
            <Button variant="outline" size="sm" onClick={() => t.setEditingSign(true)}>
              আবার ঠিক করুন
            </Button>
          </>
        )}
        <ImagePicker onPick={(files) => t.pickSign(files[0])} cameraLabel={t.sign ? "আবার তুলুন" : "স্বাক্ষরের ছবি তুলুন"} />
      </section>
    </ToolDialog>
  )
}
