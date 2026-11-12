import { CheckIcon } from "lucide-react";
import { requirements } from "../content";
import { Eyebrow } from "./section-heading";

/** Requirements. */
export function RequirementsSection() {
  return (
    <section className="border-y border-foreground/10 bg-muted/40">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 md:px-6 md:py-24 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div className="flex flex-col gap-4">
          <Eyebrow>শুরু করতে যা লাগবে</Eyebrow>
          <h2 className="text-3xl leading-tight font-extrabold tracking-tight text-balance md:text-5xl">
            নতুন কোনো মেশিন কিনতে হবে না
          </h2>
          <p className="text-lg leading-relaxed text-muted-foreground">
            দোকানে এখন যা আছে, তা দিয়েই শুরু। প্রিন্ট এজেন্ট কম্পিউটারের
            কোণে চুপচাপ বসে থাকে আর অর্ডার এলেই ঠিক প্রিন্টারে পাঠিয়ে দেয়।
          </p>
        </div>
        <ul className="flex flex-col divide-y divide-foreground/10 rounded-2xl border border-foreground/15 bg-background">
          {requirements.map((item) => (
            <li key={item.title} className="flex items-center gap-4 p-5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted">
                <item.icon className="size-5" />
              </span>
              <div className="min-w-0">
                <h3 className="font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.text}</p>
              </div>
              <CheckIcon className="ml-auto size-5 shrink-0 text-emerald-600" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
