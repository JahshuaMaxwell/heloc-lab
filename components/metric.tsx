import { cn } from "@/lib/utils";

export function PageIntro({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6 max-w-3xl">
      <p className="text-xs tracking-[0.16em] text-[#8d7340] uppercase">{eyebrow}</p>
      <h1 className="mt-1 text-3xl text-[#10243f] md:text-4xl">{title}</h1>
      <div className="mt-3 text-sm leading-6 text-[#3e4a55] md:text-base">{children}</div>
    </div>
  );
}

export function MetricCard({
  label,
  value,
  detail,
  tone = "default",
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: "default" | "good" | "warn";
}) {
  return (
    <article className="rounded-2xl border border-border bg-card px-4 py-4 shadow-sm">
      <p className="text-xs tracking-wide text-muted-foreground uppercase">{label}</p>
      <p
        className={cn(
          "num mt-2 text-2xl text-[#10243f]",
          tone === "good" && "text-[#3f4f2a]",
          tone === "warn" && "text-[#8c3a2f]",
        )}
      >
        {value}
      </p>
      {detail ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p> : null}
    </article>
  );
}

export function NoticeList({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="grid gap-2">
      {items.map((item) => (
        <li key={item} className="rounded-xl border border-[#e4d3a4] bg-[#fff8ea] px-3 py-2 text-sm leading-6 text-[#3d3112]">
          {item}
        </li>
      ))}
    </ul>
  );
}
