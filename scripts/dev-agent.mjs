// Development stand-in for the Windows print agent. It speaks the same API as the real
// agent but only pretends to print, so the whole flow can be tested without a printer.
//
//   node scripts/dev-agent.mjs <PAIRING_CODE>   # first run: pair with a shop
//   node scripts/dev-agent.mjs                  # later runs reuse the saved token
//
// Set APP_URL to point at another server (default http://localhost:3000).

import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { hostname } from "node:os"
import { fileURLToPath } from "node:url"

const APP_URL = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "")
const TOKEN_FILE = fileURLToPath(new URL("./.agent-token", import.meta.url))
// Counts as the current agent, so jobs with page ranges, both sides or other paper sizes reach it.
const VERSION = "1.2.0-dev"

// Fake printers this "PC" reports.
const PRINTERS = [
  { systemName: "HP LaserJet Pro M404 (B&W)", color: false, duplex: true, paperSizes: ["A4", "Legal"], duplexSizes: ["A4"] },
  { systemName: "Epson L3250 (Color)", color: true, duplex: false, paperSizes: ["A4", "Legal"] },
]

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function api(path, token, body) {
  const response = await fetch(`${APP_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body ?? {}),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(`${path} → ${response.status} ${data.error ?? ""}`)
  return data
}

async function getToken() {
  const code = process.argv[2]
  if (code) {
    const result = await api("/api/agent/pair", null, { code, machineName: `${hostname()} (dev)`, version: VERSION })
    writeFileSync(TOKEN_FILE, result.token)
    console.log(`Paired with "${result.shop.name}"`)
    return result.token
  }
  if (existsSync(TOKEN_FILE)) return readFileSync(TOKEN_FILE, "utf8").trim()
  console.error("Usage: node scripts/dev-agent.mjs <PAIRING_CODE>  (get a code from Dashboard → Devices)")
  process.exit(1)
}

async function heartbeat(token) {
  const result = await api("/api/agent/heartbeat", token, {
    machineName: `${hostname()} (dev)`,
    version: VERSION,
    printers: PRINTERS.map((p) => ({ ...p, state: "idle" })),
  })
  const enabled = result.devices.filter((d) => d.enabled).map((d) => d.systemName)
  console.log(`Heartbeat ok. Enabled printers: ${enabled.join(", ") || "none — enable one in Dashboard → Devices"}`)
}

async function processJob(token, job) {
  const options = [
    job.colorMode,
    `${job.copies} copies`,
    job.pages ? `pages ${job.pages}` : `all ${job.pageCount} pages`,
    job.duplex ? "both sides" : "one side",
    job.paperSize ?? "A4",
  ]
  console.log(`\n▶ Job #${job.token}: ${job.fileName} → "${job.printer}" (${options.join(", ")})`)
  const file = await fetch(job.fileUrl, { headers: { Authorization: `Bearer ${token}` } })
  if (!file.ok) {
    await api(`/api/agent/jobs/${job.id}`, token, { status: "failed", error: `Download failed (${file.status})` })
    return console.log("  ✗ download failed")
  }
  const bytes = (await file.arrayBuffer()).byteLength
  console.log(`  downloaded ${bytes} bytes, "printing"…`)
  await sleep(Math.min(10_000, 1500 + job.pageCount * job.copies * 300))
  await api(`/api/agent/jobs/${job.id}`, token, { status: "completed" })
  console.log("  ✓ completed")
}

const token = await getToken()
await heartbeat(token)
let lastHeartbeat = Date.now()

console.log("Waiting for jobs… (Ctrl+C to stop)")
for (;;) {
  try {
    if (Date.now() - lastHeartbeat > 30_000) {
      await heartbeat(token)
      lastHeartbeat = Date.now()
    }
    const { job } = await api("/api/agent/jobs/claim", token)
    if (job) await processJob(token, job)
    else await sleep(3000)
  } catch (error) {
    console.error(`! ${error.message}`)
    await sleep(5000)
  }
}
