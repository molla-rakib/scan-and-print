import type { Metadata } from "next"
import { connection } from "next/server"
import { shopMetadataInfo } from "@/features/shop-order/queries"
import { ShopOrderPage } from "@/features/shop-order/shop-order-page"

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await connection()
  const shop = await shopMetadataInfo((await params).slug)
  if (!shop) return { title: "দোকান পাওয়া যায়নি", robots: { index: false } }
  const title = `${shop.name} — প্রিন্ট করুন`
  const description = `${shop.name}${shop.address ? `, ${shop.address}` : ""}: ফোন থেকে PDF বা ছবি পাঠান, সাদা-কালো বা রঙিন বেছে নিন, বিকাশে বা ক্যাশে পেমেন্ট করুন — দোকানে নিজে থেকেই প্রিন্ট হবে।`
  const path = `/s/${shop.slug}`
  return {
    title,
    description,
    alternates: { canonical: path },
    // A page's own openGraph replaces the inherited one, so the site's preview image is named again.
    openGraph: {
      type: "website",
      title,
      description,
      url: path,
      locale: "bn_BD",
      siteName: "মুদ্রণ (Mudron)",
      images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/opengraph-image"] },
    // Suspended shops cannot take orders, so they should not show up in search.
    robots: shop.status === "active" ? undefined : { index: false },
  }
}

export default function ShopPage({ params }: Props) {
  return <ShopOrderPage params={params} />
}
