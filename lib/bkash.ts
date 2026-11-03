import "server-only"
import { decrypt } from "@/lib/crypto"
import type { ShopDoc } from "@/lib/models"

// bKash Tokenized Checkout. Each shop uses its own merchant credentials,
// so money goes straight to the shop's bKash merchant account.
const BASE_URLS = {
  sandbox: "https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/checkout",
  live: "https://tokenized.pay.bka.sh/v1.2.0-beta/tokenized/checkout",
}

export type BkashCredentials = {
  sandbox: boolean
  username: string
  password: string
  appKey: string
  appSecret: string
}

export class BkashError extends Error {}

type BkashResponse = Record<string, string | undefined>

export function shopBkashCredentials(shop: ShopDoc): BkashCredentials | null {
  const b = shop.bkash
  if (!b?.username || !b.appKey || !b.passwordEnc || !b.appSecretEnc) return null
  return {
    sandbox: b.sandbox ?? true,
    username: b.username,
    password: decrypt(b.passwordEnc),
    appKey: b.appKey,
    appSecret: decrypt(b.appSecretEnc),
  }
}

async function call(url: string, headers: Record<string, string>, body: object): Promise<BkashResponse> {
  let response: Response
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    })
  } catch {
    throw new BkashError("বিকাশের সাথে সংযোগ করা যায়নি। আবার চেষ্টা করুন।")
  }
  const data = (await response.json().catch(() => ({}))) as BkashResponse
  const failed = !response.ok || data.errorCode || (data.statusCode && data.statusCode !== "0000")
  if (failed) {
    throw new BkashError(data.statusMessage || data.errorMessage || data.message || `বিকাশ অনুরোধ ব্যর্থ হয়েছে (${response.status})`)
  }
  return data
}

const tokenCache = new Map<string, { token: string; expiresAt: number }>()

async function grantToken(creds: BkashCredentials) {
  const cacheKey = `${creds.sandbox}:${creds.username}:${creds.appKey}`
  const cached = tokenCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) return cached.token

  const base = creds.sandbox ? BASE_URLS.sandbox : BASE_URLS.live
  const data = await call(
    `${base}/token/grant`,
    { username: creds.username, password: creds.password },
    { app_key: creds.appKey, app_secret: creds.appSecret }
  )
  if (!data.id_token) throw new BkashError("বিকাশ টোকেন দেয়নি। ক্রেডেনশিয়াল যাচাই করুন।")
  // Tokens last one hour; refresh five minutes early.
  const lifetime = (Number(data.expires_in) || 3600) * 1000 - 5 * 60 * 1000
  tokenCache.set(cacheKey, { token: data.id_token, expiresAt: Date.now() + lifetime })
  return data.id_token
}

async function authedCall(creds: BkashCredentials, path: string, body: object) {
  const token = await grantToken(creds)
  const base = creds.sandbox ? BASE_URLS.sandbox : BASE_URLS.live
  return call(`${base}${path}`, { Authorization: token, "X-App-Key": creds.appKey }, body)
}

/** Verifies credentials by requesting a token. */
export async function testBkashCredentials(creds: BkashCredentials) {
  await grantToken(creds)
}

export async function createPayment(
  creds: BkashCredentials,
  input: { amount: number; invoice: string; payerReference: string; callbackURL: string }
) {
  const data = await authedCall(creds, "/create", {
    mode: "0011",
    payerReference: input.payerReference,
    callbackURL: input.callbackURL,
    amount: input.amount.toFixed(2),
    currency: "BDT",
    intent: "sale",
    merchantInvoiceNumber: input.invoice,
  })
  if (!data.paymentID || !data.bkashURL) throw new BkashError("বিকাশ পেমেন্ট লিংক দেয়নি।")
  return { paymentId: data.paymentID, bkashUrl: data.bkashURL }
}

export type PaymentResult = { completed: boolean; trxId?: string; amount?: number; payer?: string }

function toResult(data: BkashResponse): PaymentResult {
  return {
    completed: data.transactionStatus === "Completed",
    trxId: data.trxID,
    amount: data.amount ? Number(data.amount) : undefined,
    payer: data.customerMsisdn || data.payerAccount,
  }
}

export async function executePayment(creds: BkashCredentials, paymentId: string): Promise<PaymentResult> {
  try {
    return toResult(await authedCall(creds, "/execute", { paymentID: paymentId }))
  } catch (error) {
    // Execute can fail if it already ran (e.g. a repeated callback); the status query is authoritative.
    const status = await queryPayment(creds, paymentId).catch(() => null)
    if (status?.completed) return status
    throw error
  }
}

export async function queryPayment(creds: BkashCredentials, paymentId: string): Promise<PaymentResult> {
  return toResult(await authedCall(creds, "/payment/status", { paymentID: paymentId }))
}
