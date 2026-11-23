"use client"

import { useRef } from "react"
import { CameraIcon, ImagesIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

/** Two ways to give a photo: take one with the camera, or pick one from the phone. */
export function ImagePicker({
  onPick,
  multiple = false,
  disabled,
  cameraLabel = "ক্যামেরায় ছবি তুলুন",
}: {
  onPick: (files: File[]) => void
  multiple?: boolean
  disabled?: boolean
  cameraLabel?: string
}) {
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const pick = (input: HTMLInputElement) => {
    const files = Array.from(input.files ?? [])
    input.value = ""
    if (files.length) onPick(files)
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <Button className="h-12" disabled={disabled} onClick={() => cameraRef.current?.click()}>
        <CameraIcon /> {cameraLabel}
      </Button>
      <Button variant="outline" className="h-12" disabled={disabled} onClick={() => galleryRef.current?.click()}>
        <ImagesIcon /> গ্যালারি থেকে
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
