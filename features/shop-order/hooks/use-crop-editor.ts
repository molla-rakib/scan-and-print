"use client"

import { useRef } from "react"

/** What part of the photo the frame shows: its center (photo pixels) and zoom (1 = the photo just fills it). */
export type CropView = { cx: number; cy: number; zoom: number }
export type CropRect = { x: number; y: number; width: number; height: number }

export const MAX_ZOOM = 5

/** Starting view: the whole photo filling the frame, centered. */
export function initialCropView(image: { width: number; height: number }): CropView {
  return { cx: image.width / 2, cy: image.height / 2, zoom: 1 }
}

/** The photo rectangle the frame shows, kept inside the photo. `aspect` is the frame's width / height. */
export function cropRect(image: { width: number; height: number }, aspect: number, view: CropView): CropRect {
  const baseWidth = Math.min(image.width, image.height * aspect)
  const width = baseWidth / view.zoom
  const height = width / aspect
  const x = Math.min(Math.max(0, view.cx - width / 2), image.width - width)
  const y = Math.min(Math.max(0, view.cy - height / 2), image.height - height)
  return { x, y, width, height }
}

/** Dragging the photo inside a fixed frame (one finger or the mouse) and zooming with a slider. */
export function useCropEditor(
  image: { width: number; height: number },
  aspect: number,
  view: CropView,
  onChange: (view: CropView) => void,
  frameWidth: number
) {
  const drag = useRef<{ x: number; y: number; view: CropView } | null>(null)
  const rect = cropRect(image, aspect, view)
  const scale = frameWidth / rect.width

  // Re-centre from the clamped rectangle, so dragging past an edge doesn't build up hidden offset.
  const settle = (next: CropView): CropView => {
    const r = cropRect(image, aspect, next)
    return { ...next, cx: r.x + r.width / 2, cy: r.y + r.height / 2 }
  }

  const frameProps = {
    onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId)
      drag.current = { x: event.clientX, y: event.clientY, view }
    },
    onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => {
      const start = drag.current
      if (!start) return
      const dx = (event.clientX - start.x) / scale
      const dy = (event.clientY - start.y) / scale
      onChange(settle({ ...start.view, cx: start.view.cx - dx, cy: start.view.cy - dy }))
    },
    onPointerUp: () => (drag.current = null),
    onPointerCancel: () => (drag.current = null),
  }

  const setZoom = (zoom: number) => onChange(settle({ ...view, zoom: Math.min(MAX_ZOOM, Math.max(1, zoom)) }))

  return { rect, scale, frameProps, setZoom }
}
