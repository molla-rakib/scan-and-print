"use client"

// Image work for the tools on the shop page (NID copy, camera scan, photos, signatures). Everything runs in
// the customer's browser on a <canvas>: raw photos of cards and documents never leave the phone, only the
// finished PDF or JPEG does.

export type Point = { x: number; y: number }
/** Corners of a card or page in the photo, clockwise from top-left, in the photo's pixels. */
export type Quad = [Point, Point, Point, Point]
/** "color": cleaned-up color; "gray": greyscale; "bw": crisp black and white like a photocopy. */
export type ImageLook = "color" | "gray" | "bw"

/** Photos are scaled down to this before any work: plenty for A4 at 200 dpi, and fast on cheap phones. */
const MAX_SOURCE_SIDE = 2400

export function canvas(width: number, height: number) {
  const c = document.createElement("canvas")
  c.width = Math.max(1, Math.round(width))
  c.height = Math.max(1, Math.round(height))
  return c
}

function context(c: HTMLCanvasElement) {
  const ctx = c.getContext("2d", { willReadFrequently: true })
  if (!ctx) throw new Error("এই ব্রাউজারে ছবি নিয়ে কাজ করা যাচ্ছে না।")
  return ctx
}

/**
 * Reads a photo (phone rotation applied) onto a canvas no larger than `maxSide`, on white so transparent
 * PNGs don't turn black.
 */
export async function loadImage(file: Blob, maxSide = MAX_SOURCE_SIDE) {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" })
  } catch {
    throw new Error("ছবিটি খোলা যাচ্ছে না। JPG বা PNG ছবি দিন।")
  }
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const c = canvas(bitmap.width * scale, bitmap.height * scale)
  const ctx = context(c)
  ctx.fillStyle = "#fff"
  ctx.fillRect(0, 0, c.width, c.height)
  ctx.imageSmoothingQuality = "high"
  ctx.drawImage(bitmap, 0, 0, c.width, c.height)
  bitmap.close()
  return c
}

/** A copy turned 90° clockwise (or counter-clockwise), for photos taken sideways. */
export function rotate90(source: HTMLCanvasElement, clockwise = true) {
  const c = canvas(source.height, source.width)
  const ctx = context(c)
  ctx.translate(c.width / 2, c.height / 2)
  ctx.rotate(((clockwise ? 1 : -1) * Math.PI) / 2)
  ctx.drawImage(source, -source.width / 2, -source.height / 2)
  return c
}

/** A rectangle 8% in from the edges: the starting corners when nothing better is found. */
export function insetQuad(width: number, height: number, inset = 0.08): Quad {
  const [l, t, r, b] = [width * inset, height * inset, width * (1 - inset), height * (1 - inset)]
  return [
    { x: l, y: t },
    { x: r, y: t },
    { x: r, y: b },
    { x: l, y: b },
  ]
}

/**
 * Guesses where a card or page lies in a photo: the largest region that differs from the photo's border
 * color, and its four outermost corners. Good enough for a card or page on a table; the customer can drag
 * the corners when it isn't. Falls back to `insetQuad`.
 */
export function detectQuad(source: HTMLCanvasElement): Quad {
  const scale = Math.min(1, 240 / Math.max(source.width, source.height))
  const w = Math.max(8, Math.round(source.width * scale))
  const h = Math.max(8, Math.round(source.height * scale))
  const small = canvas(w, h)
  const ctx = context(small)
  ctx.drawImage(source, 0, 0, w, h)
  const { data } = ctx.getImageData(0, 0, w, h)

  // Background = median color of the border pixels.
  const border: [number, number, number][] = []
  for (let x = 0; x < w; x++) for (const y of [0, 1, h - 2, h - 1]) border.push(pixel(data, w, x, y))
  for (let y = 0; y < h; y++) for (const x of [0, 1, w - 2, w - 1]) border.push(pixel(data, w, x, y))
  const median = (i: 0 | 1 | 2) => border.map((p) => p[i]).sort((a, b) => a - b)[border.length >> 1]
  const bg = [median(0), median(1), median(2)]

  // Distance of every pixel from the background, then an Otsu threshold between "background" and "object".
  const diff = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) {
    const r = data[i * 4] - bg[0]
    const g = data[i * 4 + 1] - bg[1]
    const b = data[i * 4 + 2] - bg[2]
    diff[i] = Math.sqrt(r * r + g * g + b * b)
  }
  const threshold = Math.max(28, otsu(diff))
  const mask = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) mask[i] = diff[i] > threshold ? 1 : 0

  const component = largestComponent(mask, w, h)
  if (!component || component.length < w * h * 0.08) return insetQuad(source.width, source.height)

  let tl = component[0]
  let tr = component[0]
  let br = component[0]
  let bl = component[0]
  for (const i of component) {
    const x = i % w
    const y = (i / w) | 0
    const at = (j: number) => ({ x: j % w, y: (j / w) | 0 })
    const [a, b, c, d] = [at(tl), at(tr), at(br), at(bl)]
    if (x + y < a.x + a.y) tl = i
    if (x - y > b.x - b.y) tr = i
    if (x + y > c.x + c.y) br = i
    if (x - y < d.x - d.y) bl = i
  }
  const toSource = (i: number): Point => ({ x: ((i % w) + 0.5) / scale, y: (((i / w) | 0) + 0.5) / scale })
  return [toSource(tl), toSource(tr), toSource(br), toSource(bl)]
}

function pixel(data: Uint8ClampedArray, w: number, x: number, y: number): [number, number, number] {
  const i = (y * w + x) * 4
  return [data[i], data[i + 1], data[i + 2]]
}

function otsu(values: Float32Array) {
  const bins = new Array(256).fill(0)
  const max = Math.max(1, ...values)
  for (const v of values) bins[Math.min(255, Math.floor((v / max) * 255))]++
  const total = values.length
  let sum = 0
  for (let i = 0; i < 256; i++) sum += i * bins[i]
  let sumB = 0
  let weightB = 0
  let best = 0
  let level = 0
  for (let i = 0; i < 256; i++) {
    weightB += bins[i]
    if (!weightB) continue
    const weightF = total - weightB
    if (!weightF) break
    sumB += i * bins[i]
    const between = weightB * weightF * (sumB / weightB - (sum - sumB) / weightF) ** 2
    if (between > best) {
      best = between
      level = i
    }
  }
  return (level / 255) * max
}

/** Pixel indexes of the largest 4-connected region of 1s. */
function largestComponent(mask: Uint8Array, w: number, h: number) {
  const seen = new Uint8Array(w * h)
  let best: number[] | null = null
  const stack: number[] = []
  for (let start = 0; start < w * h; start++) {
    if (!mask[start] || seen[start]) continue
    const region: number[] = []
    stack.push(start)
    seen[start] = 1
    while (stack.length) {
      const i = stack.pop()!
      region.push(i)
      const x = i % w
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) {
        if (j >= 0 && j < w * h && mask[j] && !seen[j]) {
          seen[j] = 1
          stack.push(j)
        }
      }
    }
    if (!best || region.length > best.length) best = region
  }
  return best
}

/** Width and height of the straightened quad, from its edge lengths (keeps the photo's own resolution). */
export function quadSize(quad: Quad) {
  const d = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)
  return {
    width: (d(quad[0], quad[1]) + d(quad[3], quad[2])) / 2,
    height: (d(quad[0], quad[3]) + d(quad[1], quad[2])) / 2,
  }
}

/** Solves the 3×3 projective transform that maps the unit square's corners onto `quad`. */
function squareToQuad(quad: Quad) {
  const [p0, p1, p2, p3] = quad
  const dx1 = p1.x - p2.x
  const dx2 = p3.x - p2.x
  const dy1 = p1.y - p2.y
  const dy2 = p3.y - p2.y
  const sx = p0.x - p1.x + p2.x - p3.x
  const sy = p0.y - p1.y + p2.y - p3.y
  const det = dx1 * dy2 - dx2 * dy1 || 1e-9
  const g = (sx * dy2 - dx2 * sy) / det
  const hh = (dx1 * sy - sx * dy1) / det
  return {
    a: p1.x - p0.x + g * p1.x,
    b: p3.x - p0.x + hh * p3.x,
    c: p0.x,
    d: p1.y - p0.y + g * p1.y,
    e: p3.y - p0.y + hh * p3.y,
    f: p0.y,
    g,
    h: hh,
  }
}

/**
 * Straightens the part of `source` inside `quad` into a `width` × `height` image (perspective correction),
 * sampling with bilinear interpolation.
 */
export function warpQuad(source: HTMLCanvasElement, quad: Quad, width: number, height: number) {
  const out = canvas(width, height)
  const W = out.width
  const H = out.height
  const src = context(source).getImageData(0, 0, source.width, source.height)
  const dst = context(out).createImageData(W, H)
  const t = squareToQuad(quad)
  const sw = source.width
  const sh = source.height
  const s = src.data
  const o = dst.data

  for (let y = 0; y < H; y++) {
    const v = (y + 0.5) / H
    for (let x = 0; x < W; x++) {
      const u = (x + 0.5) / W
      const z = t.g * u + t.h * v + 1
      const fx = Math.min(sw - 1.001, Math.max(0, (t.a * u + t.b * v + t.c) / z - 0.5))
      const fy = Math.min(sh - 1.001, Math.max(0, (t.d * u + t.e * v + t.f) / z - 0.5))
      const x0 = fx | 0
      const y0 = fy | 0
      const ax = fx - x0
      const ay = fy - y0
      const i00 = (y0 * sw + x0) * 4
      const i10 = i00 + 4
      const i01 = i00 + sw * 4
      const i11 = i01 + 4
      const oi = (y * W + x) * 4
      for (let ch = 0; ch < 3; ch++) {
        const top = s[i00 + ch] + (s[i10 + ch] - s[i00 + ch]) * ax
        const bottom = s[i01 + ch] + (s[i11 + ch] - s[i01 + ch]) * ax
        o[oi + ch] = top + (bottom - top) * ay
      }
      o[oi + 3] = 255
    }
  }
  context(out).putImageData(dst, 0, 0)
  return out
}

/** Copies a rectangle of `source` (in its pixels) scaled to `width` × `height`. */
export function cropTo(source: HTMLCanvasElement, rect: { x: number; y: number; width: number; height: number }, width: number, height: number) {
  const out = canvas(width, height)
  const ctx = context(out)
  ctx.fillStyle = "#fff"
  ctx.fillRect(0, 0, out.width, out.height)
  ctx.imageSmoothingQuality = "high"
  ctx.drawImage(source, rect.x, rect.y, rect.width, rect.height, 0, 0, out.width, out.height)
  return out
}

/**
 * Cleans an image in place. Color and grey stretch the levels so a dim phone photo looks like a scan;
 * black and white divides each pixel by its neighbourhood's brightness, which removes shadows and makes text
 * crisp, like a photocopy.
 */
export function applyLook(c: HTMLCanvasElement, look: ImageLook) {
  const ctx = context(c)
  const image = ctx.getImageData(0, 0, c.width, c.height)
  const d = image.data
  const n = c.width * c.height

  if (look === "bw") {
    const gray = new Float32Array(n)
    for (let i = 0; i < n; i++) gray[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]
    const mean = boxBlur(gray, c.width, c.height, Math.max(8, Math.round(Math.max(c.width, c.height) / 40)))
    for (let i = 0; i < n; i++) {
      const ratio = gray[i] / Math.max(mean[i], 1)
      // Below ~80% of the surroundings is ink; a short ramp keeps edges smooth.
      const v = Math.max(0, Math.min(255, ((ratio - 0.72) / 0.18) * 255))
      d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v
    }
  } else {
    if (look === "gray") {
      for (let i = 0; i < n; i++) {
        const v = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]
        d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v
      }
    }
    // Stretch each channel between its 1st and 99th percentile (white balance + contrast).
    for (let ch = 0; ch < 3; ch++) {
      const hist = new Uint32Array(256)
      for (let i = 0; i < n; i++) hist[d[i * 4 + ch]]++
      const [lo, hi] = [percentile(hist, n, 0.01), percentile(hist, n, 0.99)]
      if (hi - lo < 16) continue
      for (let i = 0; i < n; i++) d[i * 4 + ch] = ((d[i * 4 + ch] - lo) / (hi - lo)) * 255
    }
  }
  ctx.putImageData(image, 0, 0)
  return c
}

function percentile(hist: Uint32Array, total: number, p: number) {
  let count = 0
  for (let v = 0; v < 256; v++) {
    count += hist[v]
    if (count >= total * p) return v
  }
  return 255
}

/** Mean of each pixel's (2r+1)² neighbourhood, via an integral image (fast for any radius). */
function boxBlur(values: Float32Array, w: number, h: number, r: number) {
  const integral = new Float64Array((w + 1) * (h + 1))
  for (let y = 0; y < h; y++) {
    let row = 0
    for (let x = 0; x < w; x++) {
      row += values[y * w + x]
      integral[(y + 1) * (w + 1) + x + 1] = integral[y * (w + 1) + x + 1] + row
    }
  }
  const out = new Float32Array(w * h)
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - r)
    const y1 = Math.min(h, y + r + 1)
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - r)
      const x1 = Math.min(w, x + r + 1)
      const sum = integral[y1 * (w + 1) + x1] - integral[y0 * (w + 1) + x1] - integral[y1 * (w + 1) + x0] + integral[y0 * (w + 1) + x0]
      out[y * w + x] = sum / ((x1 - x0) * (y1 - y0))
    }
  }
  return out
}

/**
 * Writes faint diagonal text across an image, e.g. "শুধুমাত্র ব্যাংক হিসাবের জন্য" on an NID copy. Drawn on
 * the canvas so Bangla is shaped by the browser.
 */
export function stampText(c: HTMLCanvasElement, text: string) {
  if (!text.trim()) return c
  const ctx = context(c)
  const size = Math.round(c.height / 9)
  ctx.save()
  ctx.translate(c.width / 2, c.height / 2)
  ctx.rotate(-Math.atan2(c.height, c.width))
  ctx.font = `600 ${size}px "Noto Sans Bengali", sans-serif`
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillStyle = "rgba(20, 20, 20, 0.28)"
  ctx.fillText(text.trim(), 0, 0, Math.hypot(c.width, c.height) * 0.85)
  ctx.restore()
  return c
}

export function toBlob(c: HTMLCanvasElement, type = "image/jpeg", quality = 0.92) {
  return new Promise<Blob>((resolve, reject) =>
    c.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("ছবি তৈরি করা যায়নি।"))), type, quality)
  )
}

/** The best-quality JPEG of `c` that fits in `maxBytes` (quality searched from 95% down to 20%). */
export async function jpegUnder(c: HTMLCanvasElement, maxBytes: number) {
  let lo = 0.2
  let hi = 0.95
  let best = await toBlob(c, "image/jpeg", lo)
  if (best.size > maxBytes) return best
  for (let step = 0; step < 7; step++) {
    const mid = (lo + hi) / 2
    const blob = await toBlob(c, "image/jpeg", mid)
    if (blob.size <= maxBytes) {
      best = blob
      lo = mid
    } else {
      hi = mid
    }
  }
  const top = await toBlob(c, "image/jpeg", 0.95)
  return top.size <= maxBytes ? top : best
}

export async function canvasBytes(c: HTMLCanvasElement, quality = 0.9) {
  return new Uint8Array(await (await toBlob(c, "image/jpeg", quality)).arrayBuffer())
}

/** Starts a download of a blob in the browser. */
export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
