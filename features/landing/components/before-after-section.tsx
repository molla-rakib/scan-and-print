import { CheckIcon } from "lucide-react";
import { after, before } from "../content";
import { SectionHeading } from "./section-heading";

/** Before / after. */
export function BeforeAfterSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-28">
      <SectionHeading
        eyebrow="আপনার কাউন্টারে প্রতিদিন"
        title="ভিড়ের সময়ের সেই হট্টগোল, এবার শেষ"
      />
      <div className="mt-14 grid gap-6 md:grid-cols-2">
        <div className="relative rounded-2xl border border-dashed border-foreground/25 bg-muted/40 p-6 md:-rotate-1 md:p-8">
          <span className="absolute -top-3 left-6 rounded-full bg-background px-3 text-sm font-semibold text-muted-foreground">
            আগে
          </span>
          <ul className="flex flex-col gap-5">
            {before.map((item) => (
              <li
                key={item.text}
                className="flex items-start gap-3 text-foreground/70"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground">
                  <item.icon className="size-4" />
                </span>
                <span className="pt-1.5 decoration-rose-500/60 decoration-2 md:line-through">
                  {item.text}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="relative rounded-2xl bg-primary p-6 text-primary-foreground shadow-[6px_6px_0_0_var(--foreground)] md:rotate-1 md:p-8">
          <span className="absolute -top-3 left-6 rounded-full bg-yellow-300 px-3 text-sm font-semibold text-foreground">
            এখন
          </span>
          <ul className="flex flex-col gap-5">
            {after.map((text) => (
              <li key={text} className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/15">
                  <CheckIcon className="size-4" />
                </span>
                <span className="pt-1.5 font-medium">{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
