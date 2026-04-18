"use client";

import Link from "next/link";

export default function ProjectsHeroBanner() {
  const scrollToList = () => {
    document.getElementById("projects-list")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-interview-brand-tint via-[#fff8f6] to-white px-6 py-6 sm:px-8 sm:py-8">
      {/* decorative radial glow */}
      <div
        className="pointer-events-none absolute right-0 top-0 h-full w-1/2 opacity-50"
        style={{
          background:
            "radial-gradient(ellipse at 80% 40%, var(--interview-brand-tint) 0%, transparent 70%)",
        }}
      />

      <div className="relative">
        {/* eyebrow */}
        <span className="inline-flex items-center gap-1.5 rounded-full bg-interview-brand/10 px-3 py-1 text-xs font-semibold text-interview-brand">
          <span className="h-1.5 w-1.5 rounded-full bg-interview-brand" />
          Interview intelligence
        </span>

        {/* headline */}
        <h2 className="mt-3 max-w-3xl text-2xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-3xl">
          Turn raw human signal into{" "}
          <span className="text-interview-brand">build-ready decisions.</span>
        </h2>

        {/* subcopy */}
        <p className="mt-2.5 max-w-2xl text-sm text-muted-foreground">
          Track interview volume, project readiness, and decision velocity in one operational
          console. Run analysis the moment you hit your minimum signal threshold.
        </p>

        {/* CTAs */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={scrollToList}
            className="rounded-full bg-gradient-to-br from-interview-brand to-interview-brand-end px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.99]"
          >
            Start analysis →
          </button>
          <Link
            href="/interviews/new"
            className="rounded-full border border-border bg-white px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted/50"
          >
            New project
          </Link>
        </div>
      </div>
    </div>
  );
}
