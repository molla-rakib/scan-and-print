import { cn } from "@/lib/utils";

/** WhatsApp logo (public/images/whatsapp.avif, 740×740, square on white, so the corners are rounded here). */
export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- tiny static icon
    <img
      src="/images/whatsapp.png"
      alt=""
      aria-hidden
      width={740}
      height={740}
      className={cn("size-5 shrink-0 rounded-[22%]", className)}
    />
  );
}
