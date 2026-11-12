import { BellRingIcon } from "lucide-react";
import { PrintingPress } from "@/components/printing-press";

/** A deterministic, decorative QR-like pattern (21×21 with three finder squares). */
const QR_SIZE = 21;
const qrCells = Array.from({ length: QR_SIZE * QR_SIZE }, (_, i) => {
  const x = i % QR_SIZE;
  const y = Math.floor(i / QR_SIZE);
  const finder = (fx: number, fy: number) => {
    const dx = x - fx;
    const dy = y - fy;
    if (dx < 0 || dy < 0 || dx > 6 || dy > 6) return null;
    const ring = dx === 0 || dy === 0 || dx === 6 || dy === 6;
    const core = dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4;
    return ring || core;
  };
  const f = finder(0, 0) ?? finder(14, 0) ?? finder(0, 14);
  if (f !== null) return f;
  if ((x === 7 || y === 7) && (x < 8 || y < 8)) return false;
  if (x === 13 && y < 8) return false;
  if (y === 13 && x < 8) return false;
  return (x * 7 + y * 13 + x * y * 3) % 5 < 2;
});

function FakeQr({ className }: { className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${QR_SIZE} ${QR_SIZE}`}
      className={className}
      aria-hidden
      shapeRendering="crispEdges"
    >
      {qrCells.map((on, i) =>
        on ? (
          <rect
            key={i}
            x={i % QR_SIZE}
            y={Math.floor(i / QR_SIZE)}
            width="1"
            height="1"
            fill="currentColor"
          />
        ) : null,
      )}
    </svg>
  );
}

/** Hero illustration: a printer feeding out the customer's order slip, with the QR poster beside it. */
export function PrinterScene() {
  return (
    <div
      className="relative mx-auto w-full max-w-md pt-4 pb-6 lg:max-w-none"
      aria-hidden
    >
      {/* QR poster */}
      <div className="absolute top-0 -left-2 z-20 hidden w-28 -rotate-6 rounded-xl border border-foreground/15 bg-background p-2.5 shadow-xl md:block lg:-left-10">
        <FakeQr className="w-full text-foreground" />
        <p className="pt-1.5 text-center text-[0.7rem] font-semibold">
          স্ক্যান করে প্রিন্ট দিন
        </p>
      </div>

      <PrintingPress className="relative z-10 w-full drop-shadow-xl" />

      {/* Cash alert sticky note */}
      <div className="absolute right-0 bottom-0 z-20 hidden rotate-3 items-center gap-2 rounded-lg bg-yellow-300 px-3 py-2.5 text-foreground shadow-lg md:flex lg:-right-6">
        <BellRingIcon className="size-4" />
        <div className="leading-tight">
          <div className="text-xs">নতুন ক্যাশ অর্ডার</div>
          <div className="text-sm font-bold">টোকেন #২৮ · ৳২০</div>
        </div>
      </div>
    </div>
  );
}
