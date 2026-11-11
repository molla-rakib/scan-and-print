import "server-only"
import { createHmac } from "node:crypto"

// EPS (Easy Payment System, eps.com.bd) payment gateway, used for shops paying their subscription to us.
// Flow per the EPS merchant API: GetToken → InitializeEPS (redirect the payer) → CheckMerchantTransactionStatus.
// Every request carries `x-hash`: Base64(HMAC-SHA512(hashKey, value)), where the value is the username for
// GetToken and the merchantTransactionId for the other calls.
const BASE_URLS = {
  sandbox: "https://sandboxpgapi.eps.com.bd/v1",
  live: "https://pgapi.eps.com.bd/v1",
}

export type EpsCredentials = {
  sandbox: boolean
  merchantId: string
  storeId: string
  username: string
  password: string
  hashKey: string
}

export class EpsError extends Error {}

type EpsResponse = Record<string, unknown>

function xHash(creds: EpsCredentials, value: string) {
  return createHmac("sha512", creds.hashKey).update(value, "utf8").digest("base64")
}

function base(creds: EpsCredentials) {
  return creds.sandbox ? BASE_URLS.sandbox : BASE_URLS.live
}

async function request(url: string, init: RequestInit): Promise<EpsResponse> {
  let response: Response
  try {
    response = await fetch(url, { ...init, signal: AbortSignal.timeout(30_000) })
  } catch {
    throw new EpsError("EPS-এর সাথে সংযোগ করা যায়নি। আবার চেষ্টা করুন।")
  }
  const data = (await response.json().catch(() => ({}))) as EpsResponse
  const message = typeof data.ErrorMessage === "string" ? data.ErrorMessage : ""
  if (!response.ok || message) throw new EpsError(message || `EPS অনুরোধ ব্যর্থ হয়েছে (${response.status})`)
  return data
}

const tokenCache = new Map<string, { token: string; expiresAt: number }>()

async function getToken(creds: EpsCredentials) {
  const cacheKey = `${creds.sandbox}:${creds.username}`
  const cached = tokenCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) return cached.token

  const data = await request(`${base(creds)}/Auth/GetToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", "x-hash": xHash(creds, creds.username) },
    body: JSON.stringify({ userName: creds.username, password: creds.password }),
  })
  const token = typeof data.token === "string" ? data.token : ""
  if (!token) throw new EpsError("EPS টোকেন দেয়নি। ক্রেডেনশিয়াল যাচাই করুন।")
  // Reuse for a few minutes; a fresh token is cheap.
  tokenCache.set(cacheKey, { token, expiresAt: Date.now() + 10 * 60 * 1000 })
  return token
}

/** Verifies credentials by requesting a token. */
export async function testEpsCredentials(creds: EpsCredentials) {
  tokenCache.delete(`${creds.sandbox}:${creds.username}`)
  await getToken(creds)
}

export type EpsPaymentInput = {
  /** Our unique ID for this attempt; EPS reports status by it. */
  merchantTransactionId: string
  orderId: string
  amount: number
  successUrl: string
  failUrl: string
  cancelUrl: string
  customerName: string
  customerEmail: string
  customerPhone: string
  customerAddress: string
  productName: string
  ipAddress: string
}

/** Starts a payment and returns the EPS page to send the payer to. */
export async function initializeEpsPayment(creds: EpsCredentials, input: EpsPaymentInput) {
  const token = await getToken(creds)
  const amount = Number(input.amount.toFixed(2))
  const data = await request(`${base(creds)}/EPSEngine/InitializeEPS`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "x-hash": xHash(creds, input.merchantTransactionId),
    },
    body: JSON.stringify({
      merchantId: creds.merchantId,
      storeId: creds.storeId,
      CustomerOrderId: input.orderId,
      merchantTransactionId: input.merchantTransactionId,
      transactionTypeId: 1, // web
      totalAmount: amount,
      successUrl: input.successUrl,
      failUrl: input.failUrl,
      cancelUrl: input.cancelUrl,
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      CustomerAddress: input.customerAddress,
      CustomerAddress2: "",
      CustomerCity: "Dhaka",
      CustomerState: "Dhaka",
      CustomerPostcode: "1000",
      CustomerCountry: "BD",
      CustomerPhone: input.customerPhone,
      ShippingMethod: "NO",
      NoOfItem: "1",
      productName: input.productName,
      productProfile: "general",
      productCategory: "service",
      ProductList: [
        {
          ProductName: input.productName,
          NoOfItem: "1",
          ProductProfile: "general",
          ProductCategory: "service",
          ProductPrice: String(amount),
        },
      ],
      ipAddress: input.ipAddress,
      version: "1",
    }),
  })
  const redirectUrl = typeof data.RedirectURL === "string" ? data.RedirectURL : ""
  if (!redirectUrl) throw new EpsError("EPS পেমেন্ট লিংক দেয়নি।")
  return { redirectUrl, transactionId: typeof data.TransactionId === "string" ? data.TransactionId : undefined }
}

export type EpsStatus = { paid: boolean; status: string; amount?: number; trxId?: string; payer?: string }

/** The authoritative result of a payment, asked from EPS (never trust the redirect alone). */
export async function checkEpsTransaction(creds: EpsCredentials, merchantTransactionId: string): Promise<EpsStatus> {
  const token = await getToken(creds)
  const url = `${base(creds)}/EPSEngine/CheckMerchantTransactionStatus?merchantTransactionId=${encodeURIComponent(merchantTransactionId)}`
  const data = await request(url, {
    method: "GET",
    headers: { Accept: "application/json", Authorization: `Bearer ${token}`, "x-hash": xHash(creds, merchantTransactionId) },
  })
  const status = String(data.Status ?? "").toLowerCase()
  const amount = Number(data.TotalAmount)
  return {
    paid: status === "success",
    status,
    amount: Number.isFinite(amount) ? amount : undefined,
    trxId: String(data.EPSTransactionId ?? data.TransactionId ?? "") || undefined,
    payer: typeof data.FinancialEntity === "string" ? data.FinancialEntity : undefined,
  }
}
