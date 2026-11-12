import { formatNumber } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { steps } from "../content";
import { SectionHeading } from "./section-heading";

/** How it works: tear-off tickets. */
export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="bg-paper scroll-mt-16 border-y border-foreground/10"
    >
      <div className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-28">
        <SectionHeading
          eyebrow="কীভাবে কাজ করে"
          title="চার ধাপ। দোকানদারের হাত লাগে না একবারও।"
        />
        <ol className="mt-14 grid overflow-hidden rounded-2xl border border-foreground/15 bg-background md:grid-cols-4">
          {steps.map((step, i) => (
            <li
              key={step.title}
              className="relative flex flex-col gap-3 border-dashed border-foreground/25 p-6 not-last:border-b md:p-7 md:not-last:border-r md:not-last:border-b-0"
            >
              <span
                className={cn(
                  "font-mono text-6xl leading-none font-bold tracking-tighter",
                  step.ink,
                )}
              >
                {formatNumber(i + 1).padStart(2, "০")}
              </span>
              <h3 className="text-xl font-bold">{step.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {step.text}
              </p>
              {i < steps.length - 1 && (
                <span className="absolute -right-3 -bottom-3 z-10 hidden size-6 rounded-full border border-foreground/15 bg-[oklch(0.985_0.008_85)] md:-top-3 md:bottom-auto md:block" />
              )}
              {i < steps.length - 1 && (
                <span className="absolute -right-3 -bottom-3 z-10 hidden size-6 rounded-full border border-foreground/15 bg-[oklch(0.985_0.008_85)] md:block" />
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
