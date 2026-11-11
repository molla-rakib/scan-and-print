import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { ImageResponse } from "next/og"

// Preview image for shared links (Facebook, WhatsApp, X, search results). Generated at build time.
// English text: the built-in font has no Bangla glyphs.
export const alt = "Mudron — print from your phone with a QR code"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function OpengraphImage() {
  const logo = await readFile(join(process.cwd(), "public/images/logo-small.svg"))
  const logoSrc = `data:image/svg+xml;base64,${logo.toString("base64")}`
  const inks = ["#06b6d4", "#ec4899", "#facc15", "#0b0b0c"]

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 64,
          padding: "0 88px",
          background: "#fbf8f1",
          color: "#0b0b0c",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 28 }}>
          <div style={{ display: "flex", gap: 12 }}>
            {inks.map((color) => (
              <div key={color} style={{ width: 22, height: 22, borderRadius: 11, background: color }} />
            ))}
          </div>
          <div style={{ fontSize: 96, fontWeight: 800, letterSpacing: -2 }}>Mudron</div>
          <div style={{ fontSize: 46, fontWeight: 700, lineHeight: 1.2 }}>
            Scan the QR code. Upload. Pay. It prints.
          </div>
          <div style={{ fontSize: 30, color: "#55575c", lineHeight: 1.35 }}>
            Automatic printing for print &amp; photocopy shops in Bangladesh. bKash or cash.
          </div>
          <div style={{ fontSize: 30, fontWeight: 700, color: "#1d4ed8" }}>mudron.org</div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders plain img only */}
        <img src={logoSrc} width={400} height={313} alt="" />
      </div>
    ),
    size,
  )
}
