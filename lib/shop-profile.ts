import "server-only"
import { z } from "zod"
import { Shop } from "@/lib/models"

// Shop name, link (slug), address and phone: filled in on onboarding, edited in settings.

const RESERVED_SLUGS = new Set(["admin", "api", "dashboard", "login", "onboarding", "s", "j", "app", "www"])

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/, "৩–৪০টি ইংরেজি ছোট হাতের অক্ষর, সংখ্যা বা ড্যাশ ব্যবহার করুন।")
  .refine((slug) => !RESERVED_SLUGS.has(slug), "এই লিংকটি সংরক্ষিত। অন্য একটি চেষ্টা করুন।")

export const profileSchema = z.object({
  name: z.string().trim().min(2, "দোকানের নাম খুব ছোট।").max(80),
  slug: slugSchema,
  address: z.string().trim().max(200).default(""),
  phone: z.string().trim().max(20).default(""),
})

/** The first validation message, for showing to the owner. */
export function firstError(error: z.ZodError) {
  return error.issues[0]?.message ?? "তথ্য সঠিক নয়।"
}

/** Whether another shop already uses this link. */
export async function slugTaken(slug: string, exceptShopId?: unknown) {
  return Boolean(await Shop.exists({ slug, ...(exceptShopId ? { _id: { $ne: exceptShopId } } : {}) }))
}
