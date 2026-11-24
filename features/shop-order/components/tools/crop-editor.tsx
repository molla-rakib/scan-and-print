"use client"

import { useMemo } from "react"
import { ZoomInIcon } from "lucide-react"
import { MAX_ZOOM, useCropEditor, type CropView } from "../../hooks/use-crop-editor"

const FRAME_WIDTH = 240

/**
 * A fixed-shape frame over a photo: drag the photo to place it, zoom with the slider. `guide` draws a head
 * outline for passport photos.
 */
export function CropEditor({
  image,
  aspect,
  view,
  onChange,
  guide,
}: {
  image: HTMLCanvasElement
  aspect: number
  view: CropView
  onChange: (view: CropView) => void
  guide?: "face"
}) {
  const url = useMemo(() => image.toDataURL("image/jpeg", 0.85), [image])
  const { rect, scale, frameProps, setZoom } = useCropEditor(image, aspect, view, onChange, FRAME_WIDTH)
  const height = FRAME_WIDTH / aspect

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        {...frameProps}
        className="relative cursor-grab touch-none overflow-hidden rounded-xl bg-muted shadow-md ring-2 ring-primary select-none active:cursor-grabbing"
        style={{ width: FRAME_WIDTH, height }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- local preview of the customer's photo */}
        <img
          src={url}
          alt=""
          draggable={false}
          className="pointer-events-none absolute max-w-none origin-top-left"
          style={{ width: image.width * scale, height: image.height * scale, left: -rect.x * scale, top: -rect.y * scale }}
        />
        {guide === "face" && (
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full">
            <ellipse cx="50" cy="44" rx="27" ry="31" fill="none" stroke="white" strokeWidth="0.8" strokeDasharray="3 2" vectorEffect="non-scaling-stroke" />
          </svg>
        )}
      </div>
      <label className="flex w-full max-w-xs items-center gap-3 text-sm text-muted-foreground">
        <ZoomInIcon className="size-4 shrink-0" />
        <input
          type="range"
          min={1}
          max={MAX_ZOOM}
          step={0.01}
          value={view.zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="w-full accent-primary"
          aria-label="জুম"
        />
      </label>
    </div>
  )
}
