"use client"

import { useRef } from "react"
import { CameraIcon, ImagesIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { TINTED } from "./tool-dialog"

/**
 * Two ways to give a photo: take one with the camera, or pick one from the phone. `compact` is the smaller
 * pair shown once a photo is in (to retake it).
 */
export function ImagePicker({
  onPick,
  multiple = false,
  disabled,
  compact = false,
  cameraLabel = compact ? "Retake" : "Take Photo",
}: {
  onPick: (files: File[]) => void
  multiple?: boolean
  disabled?: boolean
  compact?: boolean
  cameraLabel?: string
}) {
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const pick = (input: HTMLInputElement) => {
    const files = Array.from(input.files ?? [])
    input.value = ""
    if (files.length) onPick(files)
  }

  const tile = compact ? "h-11 rounded-xl text-[15px] font-semibold" : "h-24 flex-col gap-2 rounded-2xl text-[15px] font-semibold [&_svg:not([class*='size-'])]:size-6"

  return (
    <div className="grid grid-cols-2 gap-3">
      <Button className={cn(tile, compact ? TINTED : "shadow-sm")} disabled={disabled} onClick={() => cameraRef.current?.click()}>
        <CameraIcon /> {cameraLabel}
      </Button>
      <Button
        variant="ghost"
        className={cn(tile, compact ? TINTED : "bg-background text-primary shadow-sm ring-1 ring-foreground/10 hover:bg-background/80 hover:text-primary")}
        disabled={disabled}
        onClick={() => galleryRef.current?.click()}
      >
        <ImagesIcon /> Photo Library
      </Button>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => pick(e.currentTarget)} />
      <input
        ref={galleryRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        multiple={multiple}
        className="hidden"
        onChange={(e) => pick(e.currentTarget)}
      />
    </div>
  )
}
