"use client"

import { useRef, useState } from "react"
import type { Point, Quad } from "../lib/imaging"

/** Dragging the four corners of a card or page over its photo. Points are in the photo's pixels. */
export function useQuadEditor(quad: Quad, onChange: (quad: Quad) => void) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [active, setActive] = useState<number | null>(null)

  function toImage(event: React.PointerEvent): Point | null {
    const svg = svgRef.current
    const matrix = svg?.getScreenCTM()
    if (!svg || !matrix) return null
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse())
    const { width, height } = svg.viewBox.baseVal
    return { x: Math.min(width, Math.max(0, point.x)), y: Math.min(height, Math.max(0, point.y)) }
  }

  const handleProps = (index: number) => ({
    onPointerDown: (event: React.PointerEvent<SVGElement>) => {
      event.preventDefault()
      event.currentTarget.setPointerCapture(event.pointerId)
      setActive(index)
    },
    onPointerMove: (event: React.PointerEvent<SVGElement>) => {
      if (active !== index) return
      const point = toImage(event)
      if (!point) return
      const next = [...quad] as Quad
      next[index] = point
      onChange(next)
    },
    onPointerUp: () => setActive(null),
    onPointerCancel: () => setActive(null),
  })

  return { svgRef, active, handleProps }
}
