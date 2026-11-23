"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"
import { useQuadEditor } from "../../hooks/use-quad-editor"
import type { Quad } from "../../lib/imaging"

/**
 * A photo with the card's or page's outline on top; the customer drags the four round handles onto its
 * corners. The overlay's viewBox is the photo's own size, so corners are in the photo's pixels.
 */
export function QuadEditor({
  image,
  quad,
  onChange,
  className,
}: {
  image: HTMLCanvasElement
  quad: Quad
  onChange: (quad: Quad) => void
  className?: string
}) {
  const { svgRef, active, handleProps } = useQuadEditor(quad, onChange)
  const url = useMemo(() => image.toDataURL("image/jpeg", 0.8), [image])
  const r = Math.max(image.width, image.height) * 0.028
  const points = quad.map((p) => `${p.x},${p.y}`).join(" ")

  return (
    <div className={cn("relative mx-auto w-fit touch-none select-none", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- local preview of the customer's photo */}
      <img src={url} alt="" className="block max-h-[52svh] max-w-full rounded-lg" draggable={false} />
      <svg ref={svgRef} viewBox={`0 0 ${image.width} ${image.height}`} className="absolute inset-0 size-full overflow-visible">
        <defs>
          <mask id="quad-mask">
            <rect width={image.width} height={image.height} fill="white" />
            <polygon points={points} fill="black" />
          </mask>
        </defs>
        <rect width={image.width} height={image.height} fill="rgba(0,0,0,0.45)" mask="url(#quad-mask)" />
        <polygon points={points} fill="none" stroke="var(--color-primary)" strokeWidth={r / 4} strokeLinejoin="round" />
        {quad.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={active === i ? r * 1.35 : r}
            fill="white"
            fillOpacity={0.35}
            stroke="var(--color-primary)"
            strokeWidth={r / 3.5}
            className="cursor-grab active:cursor-grabbing"
            {...handleProps(i)}
          />
        ))}
      </svg>
    </div>
  )
}
