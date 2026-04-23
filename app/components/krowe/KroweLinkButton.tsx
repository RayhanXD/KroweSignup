import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "primary" | "secondary";
type Size = "default" | "sm";

export type KroweLinkButtonProps = Omit<ComponentProps<typeof Link>, "className" | "style"> & {
  variant?: Variant;
  size?: Size;
  className?: string;
};

export function KroweLinkButton({ variant = "secondary", size = "default", className = "", ...props }: KroweLinkButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 font-semibold transition-all duration-[var(--duration-fast)] ease-[var(--ease-out-smooth)]";

  const focusRing =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background";

  const sizing = size === "sm" ? "px-3 py-1.5 text-xs" : "px-5 py-2.5 text-sm";

  if (variant === "primary") {
    return (
      <Link
        {...props}
        className={`${base} ${focusRing} gap-2 rounded-full ${sizing} text-primary-foreground shadow-[var(--shadow-4)] hover:-translate-y-px hover:shadow-[var(--shadow-4)] active:translate-y-px motion-reduce:hover:translate-y-0 motion-reduce:active:translate-y-0 ${className}`}
        style={{ background: "var(--gradient-primary)" }}
      />
    );
  }

  return (
    <Link
      {...props}
      className={`${base} ${focusRing} rounded-full border border-border bg-surface-subtle ${sizing} text-foreground hover:border-primary hover:bg-background ${className}`}
    />
  );
}
