import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Panel({
  children,
  className,
  title,
  action
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  action?: ReactNode;
}) {
  return (
    <section className={cn("rounded-lg border border-ink/10 bg-white p-5 shadow-soft", className)}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title ? <h2 className="text-base font-semibold text-ink">{title}</h2> : <span />}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "green" | "red" | "yellow" | "neutral" | "blue" }) {
  const tones = {
    green: "bg-pine/10 text-pine",
    red: "bg-clay/10 text-clay",
    yellow: "bg-moss/15 text-ink",
    blue: "bg-sky-100 text-sky-800",
    neutral: "bg-ink/5 text-steel"
  };

  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", tones[tone])}>
      {children}
    </span>
  );
}

export function Field({
  label,
  children
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-ink">
      <span>{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "min-h-10 rounded-md border border-ink/15 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/20";

export const buttonClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-pine px-4 py-2 text-sm font-semibold text-white transition hover:bg-pine/90 disabled:cursor-not-allowed disabled:opacity-60";
