import Image from "next/image";
import Link from "next/link";
import { DownloadIcon, LogInIcon } from "lucide-react";
import {
  Bullets,
  ContentPage,
  Section,
  WhatsAppHelp,
} from "@/components/content-page";
import { Button } from "@/components/ui/button";
import { formatNumber, formatTaka } from "@/lib/constants";
import { env } from "@/lib/env";
import downloadAgent from "@/public/images/guide/download-agent.png";
import { Step, Ui } from "./components/step";

/** /guide: how to install the print agent and connect it to the shop. */
export function GuidePage() {
  const fee = env.deviceMonthlyFee;
  const trialDays = env.trialDays;

  return (
    <ContentPage
      eyebrow="ইনস্টল গাইড"
      title="প্রিন্ট এজেন্ট সেটআপ, ধাপে ধাপে"
      intro="যে কম্পিউটারে আপনার প্রিন্টার বা ফটোকপি মেশিন ইনস্টল করা আছে, সেখানে একবার এজেন্ট ইনস্টল করে একটা কোড দিলেই হলো। পুরো কাজে ১০ মিনিটের মতো লাগে।"
    >
      <WhatsAppHelp text="ইনস্টল করতে গিয়ে কোনো সমস্যা হলে আমাদের WhatsApp-এ মেসেজ দিন, আমরা সাহায্য করব।" />

      <Section title="শুরুর আগে যা লাগবে">
        <Bullets
          items={[
            <>
              Windows 10 বা Windows 11 চলা একটি কম্পিউটার, দোকান খোলা থাকলে যেটা
              চালু থাকে।
            </>,
            <>
              কম্পিউটারে প্রিন্টার ইনস্টল করা থাকতে হবে। Word বা PDF থেকে
              প্রিন্ট দেওয়া গেলেই চলবে।
            </>,
            <>ইন্টারনেট সংযোগ (ব্রডব্যান্ড বা মোবাইল ডেটা)।</>,
            <>একটি Google (Gmail) অ্যাকাউন্ট।</>,
          ]}
        />
      </Section>

      <Section title="ইনস্টলের ধাপ">
        <ol className="flex flex-col gap-10">
          <Step n={1} title="লগইন করে দোকান খুলুন">
            <p>
              <Link
                href="/login"
                className="font-medium text-primary underline underline-offset-4"
              >
                লগইন
              </Link>{" "}
              পেজে Google অ্যাকাউন্ট দিয়ে ঢুকুন। প্রথমবার দোকানের নাম, লিংক,
              ঠিকানা আর ফোন নম্বর দিয়ে দোকান তৈরি করুন। নতুন দোকান{" "}
              {formatNumber(trialDays)} দিন ফ্রি ব্যবহার করতে পারবে।
            </p>
            <p>
              এই কাজটি যেকোনো ফোন বা কম্পিউটার থেকে করা যায়, তবে পরের ধাপগুলো{" "}
              <strong>প্রিন্টার লাগানো কম্পিউটারেই</strong> করুন।
            </p>
          </Step>

          <Step n={2} title="এজেন্ট ডাউনলোড করুন">
            <p>
              প্রিন্টার লাগানো কম্পিউটারে ড্যাশবোর্ড খুলে বাঁ পাশের মেনু থেকে{" "}
              <Ui>ডিভাইস</Ui> পেজে যান। উপরের ডান কোণে <Ui>এজেন্ট ডাউনলোড</Ui>{" "}
              বাটনে চাপুন। <span className="font-mono">Mudron.exe</span> ফাইলটি
              ডাউনলোড হবে।
            </p>
            <figure className="flex flex-col gap-2">
              <Image
                src={downloadAgent}
                alt="ড্যাশবোর্ডের ডিভাইস পেজ, উপরের ডান কোণে এজেন্ট ডাউনলোড বাটন চিহ্নিত"
                sizes="(min-width: 1200px) 1200px, 100vw"
                placeholder="blur"
                className="h-auto w-full rounded-lg border shadow-sm"
              />
              <figcaption className="text-sm text-muted-foreground">
                ডিভাইস পেজের <strong>এজেন্ট ডাউনলোড</strong> বাটন (লাল দাগ
                দেওয়া)।
              </figcaption>
            </figure>
          </Step>

          <Step n={3} title="এজেন্ট চালু করুন">
            <p>
              ডাউনলোড হওয়া <span className="font-mono">Mudron.exe</span> ফাইলে
              ডাবল ক্লিক করুন। এটি নিজে থেকেই ইনস্টল হয়ে যাবে, আলাদা করে কিছু
              চাপতে হবে না। ডেস্কটপে আর Start মেনুতে <strong>Mudron</strong>{" "}
              নামে শর্টকাট তৈরি হবে।
            </p>
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
              <p className="font-semibold">
                Windows যদি নীল রঙের সতর্কবার্তা দেখায়
              </p>
              <p className="text-muted-foreground">
                &quot;Windows protected your PC&quot; লেখা এলে{" "}
                <Ui>More info</Ui> চাপুন, তারপর <Ui>Run anyway</Ui> চাপুন। এটি
                নতুন প্রোগ্রামের জন্য Windows-এর সাধারণ সতর্কবার্তা।
              </p>
            </div>
          </Step>

          <Step n={4} title="পেয়ারিং কোড দিয়ে দোকানের সাথে যুক্ত করুন">
            <p>
              এজেন্ট চালু হলে{" "}
              <strong>&quot;দোকানের সাথে যুক্ত করুন&quot;</strong> লেখা একটি
              উইন্ডো আসবে, যেখানে পেয়ারিং কোড চাইবে।
            </p>
            <Bullets
              items={[
                <>
                  ড্যাশবোর্ডের <Ui>ডিভাইস</Ui> পেজে{" "}
                  <Ui>কম্পিউটার যুক্ত করুন</Ui> বাটনে চাপুন। একটি কোড দেখাবে।
                </>,
                <>
                  কোডটি এজেন্টের উইন্ডোতে লিখে <Ui>যুক্ত করুন</Ui> চাপুন।
                </>,
                <>
                  কোডটি ১৫ মিনিট কাজ করে। সময় পার হয়ে গেলে ড্যাশবোর্ডে
                  &quot;নতুন কোড&quot; চাপুন।
                </>,
              ]}
            />
            <p>
              যুক্ত হলে এজেন্ট প্রথমবার প্রিন্টের জন্য দরকারি একটি সফটওয়্যার
              (প্রায় ২০ MB) নিজে থেকে নামিয়ে নেবে। এরপর থেকে কম্পিউটার চালু
              করলেই এজেন্ট নিজে চালু হবে।
            </p>
          </Step>

          <Step n={5} title="প্রিন্টার চালু করুন">
            <p>
              কয়েক সেকেন্ডের মধ্যে ড্যাশবোর্ডের <Ui>ডিভাইস</Ui> পেজে
              কম্পিউটারের নাম আর তার প্রিন্টারগুলো দেখা যাবে। নতুন প্রিন্টার
              বন্ধ অবস্থায় আসে। যেগুলোতে অর্ডার প্রিন্ট করবেন, সেগুলোর সুইচ
              চালু করুন।
            </p>
            <p className="text-muted-foreground">
              শুধু চালু করা প্রিন্টারেই অর্ডার যায়। প্রতিটি চালু ডিভাইসের জন্য
              মাসে {formatTaka(fee)}।
            </p>
          </Step>

          <Step n={6} title="একটি টেস্ট অর্ডার দিন">
            <p>
              ড্যাশবোর্ডের <Ui>QR ও লিংক</Ui> পেজ থেকে দোকানের লিংক খুলুন (বা
              ফোনে QR কোড স্ক্যান করুন)। একটি ছোট PDF আপলোড করে ক্যাশ পেমেন্ট
              দিয়ে অর্ডার করুন। কিছুক্ষণের মধ্যেই প্রিন্টারে কাগজ বের হবে। এরপর
              QR পোস্টার প্রিন্ট করে কাউন্টারে লাগিয়ে দিন।
            </p>
          </Step>
        </ol>
      </Section>

      <Section title="এজেন্ট চলছে কিনা কীভাবে বুঝবেন">
        <p>
          এজেন্ট টাস্কবারের ডান কোণে (ঘড়ির পাশে, দরকার হলে ^ চিহ্নে চাপুন) একটি
          নীল আইকন হিসেবে চলতে থাকে। আইকনের কোণের ছোট বিন্দু দেখে অবস্থা বুঝবেন:
        </p>
        <Bullets
          items={[
            <>
              <strong className="text-emerald-600">সবুজ</strong>: অনলাইন, অর্ডার
              এলে প্রিন্ট হবে।
            </>,
            <>
              <strong className="text-red-600">লাল</strong>: ইন্টারনেট নেই, অথবা
              দোকানের সাথে যুক্ত করা হয়নি।
            </>,
            <>
              <strong className="text-orange-600">কমলা</strong>: প্রিন্টের
              সফটওয়্যার এখনো নামানো হয়নি। ইন্টারনেট চালু রাখুন।
            </>,
          ]}
        />
        <p>
          আইকনে বা ডেস্কটপের Mudron শর্টকাটে চাপলে বিস্তারিত দেখাবে: দোকান, চালু
          প্রিন্টার, সর্বশেষ প্রিন্ট।
        </p>
      </Section>

      <Section title="সাধারণ সমস্যা ও সমাধান">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <h3 className="font-semibold">
              &quot;এই কম্পিউটারে কোনো প্রিন্টার পাওয়া যায়নি&quot;
            </h3>
            <p className="text-muted-foreground">
              Windows-এ প্রিন্টার ইনস্টল করা নেই বা ড্রাইভার নেই। Windows
              Settings → Bluetooth &amp; devices → Printers &amp; scanners-এ
              প্রিন্টারটি আছে কিনা দেখুন, আর Word থেকে একটি পেজ প্রিন্ট দিয়ে
              পরীক্ষা করুন। প্রিন্টার যোগ করার পর এক মিনিটের মধ্যে ড্যাশবোর্ডে
              চলে আসবে।
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="font-semibold">
              কম্পিউটার &quot;অফলাইন&quot; দেখাচ্ছে
            </h3>
            <p className="text-muted-foreground">
              কম্পিউটার চালু আছে, Windows-এ লগইন করা আছে আর ইন্টারনেট আছে কিনা
              দেখুন। এজেন্ট শুধু Windows-এ কেউ লগইন থাকলে চলে। আইকন না থাকলে
              ডেস্কটপের Mudron শর্টকাট থেকে চালু করুন।
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="font-semibold">পেয়ারিং কোড কাজ করছে না</h3>
            <p className="text-muted-foreground">
              কোডের মেয়াদ (১৫ মিনিট) শেষ হয়ে থাকতে পারে। ড্যাশবোর্ডে নতুন কোড
              নিয়ে আবার দিন। কোডটি ঠিকভাবে লিখেছেন কিনা মিলিয়ে নিন।
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="font-semibold">
              অর্ডার এসেছে কিন্তু প্রিন্ট হচ্ছে না
            </h3>
            <p className="text-muted-foreground">
              ড্যাশবোর্ডে প্রিন্টারের সুইচ চালু আছে কিনা, আর প্রিন্টারে কাগজ ও
              কালি আছে কিনা দেখুন। প্রিন্ট ব্যর্থ হলে প্রিন্ট অর্ডার পেজ থেকে
              আবার প্রিন্ট করতে পারবেন।
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="font-semibold">অ্যান্টিভাইরাস ফাইলটি আটকে দিচ্ছে</h3>
            <p className="text-muted-foreground">
              ফাইলটি শুধু এই সাইট থেকেই ডাউনলোড করুন। অ্যান্টিভাইরাস আটকালে
              Mudron.exe-কে অনুমতি (allow) দিন, অথবা আমাদের WhatsApp-এ জানান।
            </p>
          </div>
        </div>
      </Section>

      <Section title="আপডেট ও আনইনস্টল">
        <Bullets
          items={[
            <>
              নতুন ভার্সন এলে এজেন্ট নিজে থেকে আপডেট হয়ে যায়, আবার ডাউনলোড
              করতে হয় না।
            </>,
            <>
              মুছতে চাইলে Windows Settings → Apps-এ{" "}
              <strong>Mudron Agent</strong> খুঁজে Uninstall চাপুন। তারপর
              ড্যাশবোর্ডের ডিভাইস পেজ থেকে কম্পিউটারটি মুছে দিন।
            </>,
            <>অন্য কম্পিউটারে সরাতে চাইলে সেখানে আবার ধাপ ২ থেকে শুরু করুন।</>,
          ]}
        />
      </Section>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          size="lg"
          className="h-11"
          render={<Link href="/login" />}
          nativeButton={false}
        >
          <LogInIcon /> ড্যাশবোর্ডে যান
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="h-11"
          render={<Link href="/dashboard/devices" />}
          nativeButton={false}
        >
          <DownloadIcon /> ডিভাইস পেজ খুলুন
        </Button>
      </div>

      <WhatsAppHelp />
    </ContentPage>
  );
}
