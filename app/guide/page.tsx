import type { Metadata } from "next";
import { GuidePage } from "@/features/guide/guide-page";
import { pageMetadata } from "@/lib/seo";

const title = "ইনস্টল গাইড — প্রিন্ট এজেন্ট সেটআপ";
const description =
  "দোকানের Windows কম্পিউটারে মুদ্রণ প্রিন্ট এজেন্ট ডাউনলোড, ইনস্টল ও দোকানের সাথে যুক্ত করার ধাপে ধাপে নিয়ম। প্রিন্টার চালু করা, টেস্ট অর্ডার ও সাধারণ সমস্যার সমাধান।";

export const metadata: Metadata = pageMetadata("/guide", title, description);

export default function Page() {
  return <GuidePage />;
}
