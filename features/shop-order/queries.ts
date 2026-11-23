import "server-only"
import { findShopBySlug, publicShopView } from "@/lib/public-shop"
import { getSession } from "@/lib/session"

/** What the page's metadata shows about the shop at this link, or null when there is no such shop. */
export async function shopMetadataInfo(slug: string) {
  const shop = await findShopBySlug(slug)
  if (!shop) return null
  return { name: shop.name, address: shop.address, slug: shop.slug, status: shop.status }
}

/**
 * Everything the customer page shows about the shop at this link, or null when there is no such shop.
 * `counter` holds only when asked for (`?counter=1`) and the visitor is the shop's signed-in owner.
 */
export async function shopOrderView(slug: string, wantCounter: boolean) {
  const shop = await findShopBySlug(slug)
  if (!shop) return null
  const counter = wantCounter && (await getSession())?.userId === String(shop.ownerId)
  return { view: await publicShopView(shop), counter }
}
