import Image from "next/image";
import type { ReactNode } from "react";

type Props = {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
};

export default function DashboardPageHeader({
  eyebrow = "Dashboard",
  title,
  description,
  actions,
}: Props) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-2.5 py-1">
          <Image src="/KroweIcon.png" alt="Krowe" width={14} height={14} className="rounded-[3px]" />
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Krowe platform
          </span>
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{eyebrow}</p>
        <h2 className="serif-text mt-1 text-3xl font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
