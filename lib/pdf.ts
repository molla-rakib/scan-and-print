import "server-only"
import { PDFDocument } from "pdf-lib"

export class InvalidPdfError extends Error {}

/** Returns the page count, or throws InvalidPdfError if the file is not a readable PDF. */
export async function countPdfPages(bytes: Buffer): Promise<number> {
  if (bytes.subarray(0, 1024).indexOf("%PDF-") === -1) {
    throw new InvalidPdfError("এটি PDF ফাইল নয়।")
  }
  try {
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false })
    const pages = doc.getPageCount()
    if (pages < 1) throw new InvalidPdfError("এই PDF-এ কোনো পৃষ্ঠা নেই।")
    return pages
  } catch (error) {
    if (error instanceof InvalidPdfError) throw error
    throw new InvalidPdfError("PDF ফাইলটি পড়া যাচ্ছে না। ফাইলটি নষ্ট বা পাসওয়ার্ড দেওয়া থাকতে পারে।")
  }
}
