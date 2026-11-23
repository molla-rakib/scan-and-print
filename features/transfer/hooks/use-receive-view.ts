"use client"

import { useRef, useState } from "react"
import { formatNumber } from "@/lib/constants"
import type { TransferPageView } from "../queries"
import { useTransfer } from "./use-transfer"

export type Sending = { key: string; name: string; progress: number; error?: string }

function upload(transferId: string, file: File, onProgress: (percent: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const form = new FormData()
    form.append("file", file)
    const xhr = new XMLHttpRequest()
    xhr.open("POST", `/api/public/transfers/${transferId}/files`)
    xhr.responseType = "json"
    xhr.upload.onprogress = (e) => onProgress(Math.round((e.loaded / Math.max(e.total, 1)) * 100))
    xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error(xhr.response?.error || "ফাইল পাঠানো যায়নি।")))
    xhr.onerror = () => reject(new Error("ইন্টারনেট সংযোগে সমস্যা। আবার চেষ্টা করুন।"))
    xhr.send(form)
  })
}

/** Sending the customer's files to the shop PC, one at a time, and showing when each reached it. */
export function useReceiveView(initial: TransferPageView, maxUploadMb: number) {
  const { view } = useTransfer(initial)
  const inputRef = useRef<HTMLInputElement>(null)
  const [sending, setSending] = useState<Sending[]>([])
  const busyRef = useRef(false)
  const queueRef = useRef<{ key: string; file: File }[]>([])

  const patch = (key: string, value: Partial<Sending>) => setSending((list) => list.map((s) => (s.key === key ? { ...s, ...value } : s)))

  async function run() {
    if (busyRef.current) return
    busyRef.current = true
    try {
      for (let next = queueRef.current.shift(); next; next = queueRef.current.shift()) {
        const { key, file } = next
        try {
          await upload(view.id, file, (progress) => patch(key, { progress }))
          // Sent: the server's list now shows it; the local row goes.
          setSending((list) => list.filter((s) => s.key !== key))
        } catch (error) {
          patch(key, { error: (error as Error).message })
        }
      }
    } finally {
      busyRef.current = false
    }
  }

  function addFiles(list: FileList | null) {
    const files = Array.from(list ?? [])
    if (inputRef.current) inputRef.current.value = ""
    const added = files.map((file) => ({
      key: crypto.randomUUID(),
      name: file.name,
      progress: 0,
      error: file.size > maxUploadMb * 1024 * 1024 ? `ফাইলটি অনেক বড়। সর্বোচ্চ ${formatNumber(maxUploadMb)} MB।` : undefined,
      file,
    }))
    setSending((current) => [...current, ...added.map(({ key, name, progress, error }) => ({ key, name, progress, error }))])
    queueRef.current.push(...added.filter((a) => !a.error).map(({ key, file }) => ({ key, file })))
    run()
  }

  const sent = view.files.filter((f) => f.from === "customer")
  return { view, inputRef, sending, sent, addFiles, dismiss: (key: string) => setSending((list) => list.filter((s) => s.key !== key)) }
}
