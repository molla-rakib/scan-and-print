import "server-only"
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomInt } from "node:crypto"
import { env } from "@/lib/env"

function key() {
  const buffer = Buffer.from(env.encryptionKey, "base64")
  if (buffer.length !== 32) throw new Error("ENCRYPTION_KEY must be 32 bytes, base64 encoded")
  return buffer
}

/** AES-256-GCM. Output: base64(iv | authTag | ciphertext). Used for bKash secrets at rest. */
export function encrypt(plain: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", key(), iv)
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64")
}

export function decrypt(payload: string): string {
  const buffer = Buffer.from(payload, "base64")
  const decipher = createDecipheriv("aes-256-gcm", key(), buffer.subarray(0, 12))
  decipher.setAuthTag(buffer.subarray(12, 28))
  return Buffer.concat([decipher.update(buffer.subarray(28)), decipher.final()]).toString("utf8")
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex")
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url")
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // no 0/O/1/I

export function randomCode(length: number): string {
  return Array.from({ length }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("")
}

export function randomDigits(length: number): string {
  return Array.from({ length }, () => randomInt(10)).join("")
}
