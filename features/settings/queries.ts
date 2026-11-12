import "server-only"
import { requireShop } from "@/lib/auth"
import type { BkashInitial, CashSettings, Pricing, ProfileSettings } from "./types"

/** The shop's name, link, address and phone for the profile form. */
export async function getProfileSettings(): Promise<ProfileSettings> {
  const { shop } = await requireShop()
  return { name: shop.name, slug: shop.slug, address: shop.address, phone: shop.phone }
}

/** The shop's print prices for the pricing form. */
export async function getPricingSettings(): Promise<Pricing> {
  const { shop } = await requireShop()
  // Sheet prices that were never set show the one-side price, which is what customers are charged.
  const prices = (p: { bw: number; color: number; bwSheet?: number | null; colorSheet?: number | null }) => ({
    bw: p.bw,
    color: p.color,
    bwSheet: p.bwSheet ?? p.bw,
    colorSheet: p.colorSheet ?? p.color,
  })
  return {
    ...prices(shop.pricing),
    colorDuplex: shop.pricing.colorDuplex,
    paperSizes: {
      Legal: { enabled: shop.paperSizes.Legal.enabled, ...prices(shop.paperSizes.Legal) },
      A3: { enabled: shop.paperSizes.A3.enabled, ...prices(shop.paperSizes.A3) },
    },
  }
}

/** The shop's cash and bKash settings for the payment forms (secrets only as "is set"). */
export async function getPaymentSettings(): Promise<{ cash: CashSettings; bkash: BkashInitial }> {
  const { shop } = await requireShop()
  return {
    cash: {
      enabled: shop.cash.enabled,
      askName: shop.cash.askName ?? true,
      askPhone: shop.cash.askPhone ?? true,
    },
    bkash: {
      enabled: shop.bkash.enabled,
      sandbox: shop.bkash.sandbox,
      username: shop.bkash.username,
      appKey: shop.bkash.appKey,
      hasPassword: Boolean(shop.bkash.passwordEnc),
      hasAppSecret: Boolean(shop.bkash.appSecretEnc),
    },
  }
}
