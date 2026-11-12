"use client"

import { useEffect, useMemo, useState } from "react"
import { isImageFile, pageThumbnail, thumbnailKey } from "../lib/preview"

/** A thumbnail URL for one page of a PDF or for a photo, or null while it is being drawn. */
export function usePageThumbnail(file: File, pageNumber: number, width: number, enabled = true) {
  const image = isImageFile(file)
  const imageUrl = useMemo(() => (image ? URL.createObjectURL(file) : null), [file, image])
  useEffect(() => () => void (imageUrl && URL.revokeObjectURL(imageUrl)), [imageUrl])

  const key = thumbnailKey(file, pageNumber, width)
  const [rendered, setRendered] = useState<{ key: string; url: string } | null>(null)

  useEffect(() => {
    if (image || !enabled) return
    let cancelled = false
    pageThumbnail(key, file, pageNumber, width)
      .then((url) => !cancelled && setRendered({ key, url }))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [file, image, key, pageNumber, width, enabled])

  return imageUrl ?? (rendered?.key === key ? rendered.url : null)
}
