import "server-only"
import mongoose from "mongoose"
import { Readable } from "node:stream"
import { connectDb } from "@/lib/db"
import { PrintJob } from "@/lib/models"

// PDFs live in MongoDB GridFS only until they're printed (see discardJobFile).
const BUCKET = "printFiles"
const ORPHAN_AGE_MS = 24 * 60 * 60 * 1000

async function bucket() {
  const { connection } = await connectDb()
  return new mongoose.mongo.GridFSBucket(connection.db!, { bucketName: BUCKET })
}

function toId(key: string) {
  return new mongoose.Types.ObjectId(key)
}

/** Stores a PDF and returns its key. */
export async function saveFile(data: Buffer, fileName: string, shopId: string): Promise<string> {
  const upload = (await bucket()).openUploadStream(fileName, { metadata: { shopId, contentType: "application/pdf" } })
  await new Promise<void>((resolve, reject) => {
    Readable.from([data]).pipe(upload).on("finish", resolve).on("error", reject)
  })
  return upload.id.toString()
}

/** Web stream of the file, for sending it to the agent. */
export async function openFile(key: string): Promise<ReadableStream<Uint8Array>> {
  const stream = (await bucket()).openDownloadStream(toId(key))
  return Readable.toWeb(stream) as ReadableStream<Uint8Array>
}

export async function deleteFile(key: string) {
  try {
    await (await bucket()).delete(toId(key))
  } catch (error) {
    if (!(error instanceof mongoose.mongo.MongoRuntimeError && /not found/i.test(error.message))) throw error
  }
}

let lastSweep = 0

/**
 * Deletes files older than a day that no unprinted job still needs (e.g. drafts removed by the TTL index).
 * Runs at most once an hour; cheap because only a few files exist at any time.
 */
export async function sweepOrphanFiles() {
  const now = Date.now()
  if (now - lastSweep < 60 * 60 * 1000) return
  lastSweep = now

  const b = await bucket()
  const old = await b.find({ uploadDate: { $lt: new Date(now - ORPHAN_AGE_MS) } }, { projection: { _id: 1 } }).toArray()
  if (old.length === 0) return
  const keys = old.map((file) => file._id.toString())
  const inUse = new Set(
    (await PrintJob.find({ fileKey: { $in: keys }, fileDeleted: false }, { fileKey: 1 }).lean()).map((job) => job.fileKey)
  )
  for (const key of keys) if (!inUse.has(key)) await deleteFile(key)
}
