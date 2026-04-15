import Image from "next/image";
import type { ReactNode } from "react";

type Props = {
  title?: string;
  actions?: ReactNode;
};

export default function InterviewsTopbar({ title = "Krowe Dashboard", actions }: Props) {
  return (
    <header className="mb-3 flex items-center justify-between border-b border-border/60 pb-3">
      <div className="flex items-center gap-2">
        <Image src="/KroweIcon.png" alt="Krowe" width={18} height={18} className="h-[18px] w-[18px] rounded-sm" />
        <h1 className="text-sm font-medium text-foreground">{title}</h1>
      </div>
      <div className="flex items-center gap-2">{actions}</div>
    </header>
  );
}
