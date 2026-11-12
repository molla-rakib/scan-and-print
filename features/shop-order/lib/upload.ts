import { UPLOAD_CHUNK_BYTES } from "@/lib/constants"

type Uploaded = { order: string; file: { id: string; pageCount: number } }

export async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || "কিছু একটা সমস্যা হয়েছে। আবার চেষ্টা করুন।")
  return data as T
}

/** Sends one request with upload progress. Resolves with the JSON response. */
function send(url: string, body: XMLHttpRequestBodyInit, onProgress: (loaded: number) => void, onSent?: () => void) {
  return new Promise<Record<string, unknown>>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("POST", url)
    xhr.responseType = "json"
    xhr.upload.onprogress = (e) => onProgress(e.loaded)
    if (onSent) xhr.upload.onload = onSent
    xhr.onload = () => {
      const data = xhr.response ?? {}
      if (xhr.status < 300) resolve(data)
      else reject(Object.assign(new Error(data.error || "ফাইল আপলোড ব্যর্থ হয়েছে। আবার চেষ্টা করুন।"), { status: xhr.status }))
    }
    xhr.onerror = () => reject(Object.assign(new Error("ইন্টারনেট সংযোগে সমস্যা। আবার চেষ্টা করুন।"), { status: 0 }))
    xhr.send(body)
  })
}

/**
 * Uploads one file into the draft order (created by the first upload), reporting progress in percent.
 * Files above UPLOAD_CHUNK_BYTES go in pieces, because Vercel rejects request bodies over 4.5 MB; each
 * piece is retried a couple of times on a flaky connection.
 */
export async function uploadFile(slug: string, file: File, order: string | null, onProgress: (percent: number) => void, onSent: () => void) {
  const form = new FormData()
  form.append("slug", slug)
  if (order) form.append("order", order)
  const percent = (sent: number) => onProgress(Math.min(100, Math.round((sent / Math.max(file.size, 1)) * 100)))

  if (file.size <= UPLOAD_CHUNK_BYTES) {
    form.append("file", file)
    // onSent fires once the bytes are out and the server starts checking the file.
    return (await send("/api/public/orders", form, percent, onSent)) as Uploaded
  }

  const uploadId = crypto.randomUUID().replaceAll("-", "")
  const parts = Math.ceil(file.size / UPLOAD_CHUNK_BYTES)
  for (let index = 0; index < parts; index++) {
    const start = index * UPLOAD_CHUNK_BYTES
    const piece = file.slice(start, start + UPLOAD_CHUNK_BYTES)
    const url = `/api/public/uploads?slug=${encodeURIComponent(slug)}&upload=${uploadId}&index=${index}`
    for (let attempt = 1; ; attempt++) {
      try {
        await send(url, piece, (loaded) => percent(start + loaded))
        break
      } catch (error) {
        const status = (error as { status?: number }).status ?? 0
        // Retry only network failures and server hiccups, not "this shop is closed" and the like.
        if (attempt >= 3 || (status >= 400 && status < 500)) throw error
        await new Promise((resolve) => setTimeout(resolve, attempt * 1500))
      }
    }
  }
  onSent()
  form.append("upload", uploadId)
  form.append("parts", String(parts))
  form.append("name", file.name)
  return (await send("/api/public/orders", form, () => {})) as Uploaded
}
