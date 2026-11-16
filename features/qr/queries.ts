import "server-only"
import QRCode from "qrcode"
import { env } from "@/lib/env"

/** The shop's order page link that the QR code and share buttons point to. */
export function shopOrderUrl(slug: string) {
  return `${env.appUrl}/s/${slug}`
}

/** The QR code for a link, as an SVG string. */
export function qrSvg(url: string) {
  return QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "M" })
}
