// Copies MediaPipe's WebAssembly runtime from node_modules into public/mediapipe/, so the passport photo tool
// loads it from our own site. Runs before `npm run dev` and `npm run build`; the copies are not committed
// (14 MB). The segmentation model next to them (selfie_segmenter.tflite) is committed.
import { copyFileSync, mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const from = join(root, "node_modules", "@mediapipe", "tasks-vision", "wasm")
const to = join(root, "public", "mediapipe")
mkdirSync(to, { recursive: true })
for (const file of ["vision_wasm_internal.js", "vision_wasm_internal.wasm"]) copyFileSync(join(from, file), join(to, file))
