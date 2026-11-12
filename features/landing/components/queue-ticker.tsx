import { cn } from "@/lib/utils";
import { inks, ticker } from "../content";

/** Live queue ticker. */
export function QueueTicker() {
  return (
    <div
      className="overflow-hidden border-b bg-foreground py-3 text-background"
      aria-hidden
    >
      <div className="animate-ticker flex w-max gap-10 font-mono text-sm whitespace-nowrap">
        {[...ticker, ...ticker].map((item, i) => (
          <span key={i} className="flex items-center gap-10">
            <span className="flex items-center gap-2">
              <span className={cn("size-2 rounded-full", inks[i % 3])} />
              {item}
            </span>
            <span className="text-background/30">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}
