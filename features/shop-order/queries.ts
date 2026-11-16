import "server-only"
import { findShopBySlug, publicShopView } from "@/lib/public-shop"

/** What the page's metadata shows about the shop at this link, or null when there is no such shop. */
export async function shopMetadataInfo(slug: string) {
  const shop = await findShopBySlug(slug)
  if (!shop) return null
  return { name: shop.name, address: shop.address, slug: shop.slug, status: shop.status }
}

/** Everything the customer page shows about the shop at this link, or null when there is no such shop. */
export async function shopOrderView(slug: string) {
  const shop = await findShopBySlug(slug)
  return shop ? publicShopView(shop) : null
}
