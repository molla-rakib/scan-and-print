import { formatNumber } from "@/lib/constants";

/** A numbered install step. */
export function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="relative flex gap-4">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">
        {formatNumber(n)}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-3 pt-1 leading-relaxed">
        <h3 className="text-xl font-bold">{title}</h3>
        {children}
      </div>
    </li>
  );
}

/** A button or menu name as shown on screen. */
export function Ui({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-muted px-1.5 py-0.5 font-semibold text-foreground">
      {children}
    </span>
  );
}
