import type { MetadataRoute } from "next"
import { connection } from "next/server"
import { connectDb } from "@/lib/db"
import { Shop } from "@/lib/models"
import { siteUrl } from "@/lib/seo"

// Home, llms.txt and every active shop's order page. Read on each request (shops come and go, and
// the database is not reachable while the Docker image is built).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection()
  await connectDb()
  const shops = await Shop.find({ status: "active" }).select("slug updatedAt").lean()
  return [
    { url: siteUrl("/"), changeFrequency: "weekly", priority: 1 },
    { url: siteUrl("/llms.txt"), changeFrequency: "monthly", priority: 0.3 },
    ...shops.map((shop) => ({
      url: siteUrl(`/s/${shop.slug}`),
      lastModified: shop.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ]
}
