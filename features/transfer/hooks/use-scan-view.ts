"use client"

import { useState } from "react"
import { toast } from "sonner"
import type { TransferPageView } from "../queries"
import { useTransfer } from "./use-transfer"

export const fileUrl = (transferId: string, fileId: string, inline = false) =>
  `/api/public/transfers/${transferId}/files/${fileId}${inline ? "?inline=1" : ""}`

/** Starts a download of a blob in the browser. */
function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/** The shop's scans arriving on the phone, and joining them all into one PDF to download. */
export function useScanView(initial: TransferPageView) {
  const { view } = useTransfer(initial)
  const [merging, setMerging] = useState(false)
  const files = view.files.filter((f) => f.from === "shop" && f.available)

  async function downloadAll() {
    setMerging(true)
    try {
      const { PDFDocument } = await import("pdf-lib")
      const doc = await PDFDocument.create()
      for (const file of files) {
        const bytes = new Uint8Array(await (await fetch(fileUrl(view.id, file.id, true))).arrayBuffer())
        if (file.contentType === "application/pdf") {
          const source = await PDFDocument.load(bytes, { ignoreEncryption: true })
          for (const page of await doc.copyPages(source, source.getPageIndices())) doc.addPage(page)
        } else {
          const image = file.contentType === "image/png" ? await doc.embedPng(bytes) : await doc.embedJpg(bytes)
          const page = doc.addPage([image.width, image.height])
          page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height })
        }
      }
      saveBlob(new Blob([new Uint8Array(await doc.save())], { type: "application/pdf" }), "scan.pdf")
    } catch {
      toast.error("একসাথে PDF বানানো যায়নি। ফাইলগুলো আলাদা করে ডাউনলোড করুন।")
    } finally {
      setMerging(false)
    }
  }

  return { view, files, merging, downloadAll }
}
