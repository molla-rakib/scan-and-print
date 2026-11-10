import { cn } from "@/lib/utils";

/**
 * The মুদ্রণ (Mudron) logo: printing press, name and tagline (public/images/logo.svg, 3829×1494).
 * Size it by height, e.g. className="h-8"; the width follows.
 */
export function Logo({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static SVG
    <img
      src="/images/logo.svg"
      alt="মুদ্রণ"
      width={200}
      className={cn("h-9 w-auto shrink-0", className)}
    />
  );
}
