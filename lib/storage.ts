import "server-only"
import { Client } from "minio"
import { env } from "@/lib/env"

// Fixed region so presigning never needs a network round-trip to discover it.
const REGION = "us-east-1"

function clientFor(endpoint: string) {
  const url = new URL(endpoint)
  return new Client({
    endPoint: url.hostname,
    port: url.port ? Number(url.port) : undefined,
    useSSL: url.protocol === "https:",
    accessKey: env.s3.accessKey,
    secretKey: env.s3.secretKey,
    region: REGION,
  })
}

const globalCache = globalThis as unknown as { __storage?: { internal: Client; public: Client } }

/**
 * `internal` talks to MinIO from the server; `public` signs URLs that browsers
 * and shop agents use, so it must use the publicly reachable endpoint.
 */
function clients() {
  globalCache.__storage ??= { internal: clientFor(env.s3.endpoint), public: clientFor(env.s3.publicEndpoint) }
  return globalCache.__storage
}

export function uploadKey(shopId: string) {
  return `uploads/${shopId}/${crypto.randomUUID()}.pdf`
}

/** Browser upload form limited to one PDF of at most `maxBytes`. */
export async function presignUpload(key: string, maxBytes: number) {
  const { public: client } = clients()
  const policy = client.newPostPolicy()
  policy.setBucket(env.s3.bucket)
  policy.setKey(key)
  policy.setContentType("application/pdf")
  policy.setContentLengthRange(1, maxBytes)
  policy.setExpires(new Date(Date.now() + 15 * 60 * 1000))
  return client.presignedPostPolicy(policy)
}

/** Short-lived download link for the shop agent. */
export async function presignDownload(key: string, expirySeconds = 10 * 60) {
  return clients().public.presignedGetObject(env.s3.bucket, key, expirySeconds)
}

export async function statFile(key: string) {
  try {
    return await clients().internal.statObject(env.s3.bucket, key)
  } catch {
    return null
  }
}

export async function readFile(key: string): Promise<Buffer> {
  const stream = await clients().internal.getObject(env.s3.bucket, key)
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(chunk as Buffer)
  return Buffer.concat(chunks)
}

export async function deleteFile(key: string) {
  await clients().internal.removeObject(env.s3.bucket, key)
}
