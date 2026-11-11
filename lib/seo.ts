import "server-only"
import { env } from "@/lib/env"

/**
 * What the site says about itself to search engines, link previews and AI agents (metadata in
 * app/layout.tsx, structured data on the home page, app/llms.txt). Bangla first, since the site is;
 * English alongside for crawlers and AI agents that work in English.
 */
export const seo = {
  name: "মুদ্রণ",
  nameEn: "Mudron",
  title: "মুদ্রণ (Mudron) — QR কোড দিয়ে প্রিন্ট, প্রিন্ট ও ফটোকপি দোকানের জন্য",
  description:
    "প্রিন্ট ও ফটোকপি দোকানের জন্য স্বয়ংক্রিয় প্রিন্টিং। গ্রাহক দোকানের QR কোড স্ক্যান করে PDF বা ছবি আপলোড করে, সাদা-কালো বা রঙিন ও কপি বেছে নেয়, বিকাশে বা ক্যাশে পেমেন্ট করে — আর দোকানের প্রিন্টারে নিজে থেকেই প্রিন্ট হয়ে যায়।",
  descriptionEn:
    "Mudron is automatic printing for print and photocopy shops in Bangladesh. A customer scans the shop's QR code, uploads a PDF or photo, picks black & white or color and the number of copies, pays with bKash or cash at the counter, and the job prints by itself on a printer in the shop.",
  keywords: [
    "মুদ্রণ",
    "Mudron",
    "প্রিন্ট দোকান",
    "ফটোকপি দোকান",
    "QR কোড প্রিন্ট",
    "অনলাইন প্রিন্ট",
    "PDF প্রিন্ট",
    "বিকাশ পেমেন্ট",
    "print shop software Bangladesh",
    "photocopy shop",
    "QR code printing",
    "self-service printing",
    "PDF printing",
    "bKash payment",
    "print shop management",
  ],
}

/** Absolute URL on this site. The base is APP_URL (https://mudron.org in production). */
export function siteUrl(path = "/") {
  return new URL(path, `${env.appUrl}/`).toString()
}
