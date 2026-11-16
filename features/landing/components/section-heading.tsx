export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2 text-sm font-semibold text-primary">
      <span className="h-px w-6 bg-primary" />
      {children}
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="text-3xl leading-tight font-extrabold tracking-tight text-balance md:text-5xl">
        {title}
      </h2>
    </div>
  );
}
