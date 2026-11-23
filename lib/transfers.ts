import "server-only"
import type { Types } from "mongoose"
import QRCode from "qrcode"
import { TRANSFER_FILE_TYPES } from "@/lib/constants"
import { randomToken } from "@/lib/crypto"
import { env } from "@/lib/env"
import { Transfer, type TransferDoc } from "@/lib/models"
import { deleteFile, saveFile } from "@/lib/storage"

/**
 * Counter transfers between the shop PC and a customer's phone (see the Transfer model): "scan" sends the
 * shop's scans to the phone, "receive" brings the customer's files to the PC. Opened from the agent.
 */

/** A session closes this long after it opens; its files are deleted then. */
export const TRANSFER_MINUTES = 30
export const MAX_TRANSFER_FILES = 50

export type TransferKind = "scan" | "receive"

// Scans from the PC are PDFs or pictures; what customers may send is TRANSFER_FILE_TYPES.
const CUSTOMER_TYPES = TRANSFER_FILE_TYPES
const SCAN_TYPES = ["pdf", "jpg", "jpeg", "png"]

function extension(name: string) {
  return /\.([a-z0-9]{1,5})$/i.exec(name)?.[1]?.toLowerCase() ?? ""
}

/** Content type of an allowed file, or null when files with this name may not be sent. */
export function transferContentType(name: string, from: "shop" | "customer") {
  const ext = extension(name)
  if (from === "shop") return SCAN_TYPES.includes(ext) ? CUSTOMER_TYPES[ext] : null
  return CUSTOMER_TYPES[ext] ?? null
}

/** A file name safe to store and to save on the PC: no folders, no odd characters, at most 120 characters. */
export function cleanFileName(name: string) {
  const base = name.split(/[\\/]/).pop() ?? ""
  const cleaned = base.replace(/[\u0000-\u001f<>:"|?*]/g, "_").replace(/^\.+/, "").trim()
  return cleaned.slice(-120) || "file"
}

export function transferUrl(publicId: string) {
  return `${env.appUrl}/t/${publicId}`
}

export async function openTransfer(shopId: Types.ObjectId, agentId: Types.ObjectId, kind: TransferKind) {
  const now = Date.now()
  const transfer = await Transfer.create({
    publicId: randomToken(12),
    shopId,
    agentId,
    kind,
    closesAt: new Date(now + TRANSFER_MINUTES * 60 * 1000),
    expiresAt: new Date(now + 24 * 60 * 60 * 1000),
  })
  const url = transferUrl(transfer.publicId)
  // The agent shows this QR in its window (it has no QR library of its own).
  const qrSvg = await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M" })
  return { transfer, url, qrSvg }
}

/** Whether a session still takes files: open and not past its closing time. */
export function transferOpen(transfer: TransferDoc) {
  return transfer.status === "open" && transfer.closesAt.getTime() > Date.now()
}

/** Closes a session and deletes every file it still holds. */
export async function closeTransfer(transfer: TransferDoc) {
  for (const file of transfer.files) {
    if (!file.deleted) await deleteFile(file.fileKey).catch((error) => console.error("Failed to delete transfer file", error))
  }
  await Transfer.updateOne(
    { _id: transfer._id },
    { $set: { status: "closed", "files.$[].deleted": true, closesAt: new Date(Math.min(Date.now(), transfer.closesAt.getTime())) } }
  )
}

let lastClose = 0

/** Closes sessions past their closing time and deletes their files; at most every minute. */
export async function closeExpiredTransfers() {
  const now = Date.now()
  if (now - lastClose < 60 * 1000) return
  lastClose = now
  const stale = await Transfer.find({ $or: [{ status: "open" }, { "files.deleted": false }], closesAt: { $lt: new Date(now) } })
  for (const transfer of stale) await closeTransfer(transfer)
}

/** What both the phone and the agent see of a session. */
export function transferView(transfer: TransferDoc) {
  return {
    id: transfer.publicId,
    kind: transfer.kind as TransferKind,
    open: transferOpen(transfer),
    closesAt: transfer.closesAt.toISOString(),
    files: transfer.files.map((file) => ({
      id: String(file._id),
      name: file.name,
      size: file.size,
      contentType: file.contentType,
      from: file.from as "shop" | "customer",
      fetched: Boolean(file.fetchedAt),
      available: !file.deleted,
    })),
  }
}

export type TransferView = ReturnType<typeof transferView>

/** Response headers for sending a transfer file; `attachment` makes browsers save it instead of opening it. */
export function fileHeaders(file: { name: string; size: number; contentType: string }, attachment: boolean) {
  const ascii = file.name.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "")
  return {
    "Content-Type": file.contentType,
    "Content-Length": String(file.size),
    "Content-Disposition": `${attachment ? "attachment" : "inline"}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(file.name)}`,
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  }
}

/** Adds a file to a session (GridFS + the session's list). Returns the stored file's view, or an error message. */
export async function addTransferFile(transfer: TransferDoc, data: Buffer, rawName: string, from: "shop" | "customer") {
  const name = cleanFileName(rawName)
  const contentType = transferContentType(name, from)
  if (!contentType) {
    return { error: from === "shop" ? "শুধু PDF, JPG বা PNG স্ক্যান পাঠানো যায়।" : "এই ধরনের ফাইল পাঠানো যায় না। PDF, ছবি, Word, Excel বা PowerPoint ফাইল দিন।" }
  }
  if (transfer.files.filter((f) => !f.deleted).length >= MAX_TRANSFER_FILES) return { error: "এই সেশনে আর ফাইল নেওয়া যাবে না।" }
  const fileKey = await saveFile(data, name, String(transfer.shopId), contentType)
  const updated = await Transfer.findOneAndUpdate(
    { _id: transfer._id, status: "open" },
    { $push: { files: { fileKey, name, size: data.length, contentType, from } } },
    { returnDocument: "after" }
  )
  if (!updated) {
    await deleteFile(fileKey).catch(() => {})
    return { error: "সেশনটি শেষ হয়ে গেছে।" }
  }
  const file = updated.files[updated.files.length - 1]
  return { file: { id: String(file._id), name: file.name, size: file.size } }
}
