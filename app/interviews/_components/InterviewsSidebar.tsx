import Image from "next/image";
import Link from "next/link";

type SidebarNavKey = "interviews" | "imports" | "usage" | "logs" | "script" | "decision" | "businessProfile";

type NavItem = {
  key: SidebarNavKey;
  href: string;
  label: string;
  icon: string;
};

const manageNavItems: NavItem[] = [
  { key: "interviews", href: "/interviews", label: "Interviews", icon: "forum" },
  { key: "script", href: "/interviews/script", label: "Interview Script", icon: "description" },
];


function navClass(active: boolean): string {
  if (active) {
    return "flex items-center gap-2 rounded-lg bg-interview-brand-tint/70 px-2.5 py-2 text-sm font-medium text-interview-brand";
  }

  return "flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interview-brand/35";
}

export default function InterviewsSidebar({
  activeNav,
  projectId,
}: {
  activeNav?: SidebarNavKey;
  projectId?: string;
}) {
  return (
    <aside className="sticky top-0 flex h-screen flex-col overflow-y-auto border-r border-border/60 bg-[color-mix(in_srgb,var(--surface-subtle)_75%,white)] p-3">
      <Link
        href="/interviews/projects"
        className="mb-3 flex items-center gap-2 rounded-xl border border-border/60 bg-background px-2.5 py-2 transition-colors hover:bg-muted/50"
      >
        <Image
          src="/KroweIcon.png"
          alt="Krowe icon"
          width={22}
          height={22}
          className="h-[22px] w-[22px] rounded-sm"
        />
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-foreground">Krowe</p>
        </div>
      </Link>

      <nav aria-label="Primary" className="space-y-3">
        <div>
          <p className="px-2 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Manage
          </p>
          <div className="space-y-1">
            {manageNavItems.map((item) => (
              <Link key={item.key} href={item.href} className={navClass(activeNav === item.key)}>
                <span className="material-symbols-outlined text-base" aria-hidden>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            ))}
            <Link
              href={projectId ? `/interviews/${projectId}/business-profile` : "/interviews/projects"}
              className={navClass(activeNav === "businessProfile")}
            >
              <span className="material-symbols-outlined text-base" aria-hidden>
                apartment
              </span>
              Business Profile
            </Link>
            <Link
              href={projectId ? `/interviews/${projectId}/decision` : "/interviews/projects"}
              className={navClass(activeNav === "decision")}
            >
              <span className="material-symbols-outlined text-base" aria-hidden>
                analytics
              </span>
              Decision
            </Link>
            <Link
              href="/interviews/usage?range=24h"
              className={navClass(activeNav === "usage")}
            >
              <span className="material-symbols-outlined text-base" aria-hidden>
                insights
              </span>
              Usage
            </Link>
            <Link
              href="/interviews/logs"
              className={navClass(activeNav === "logs")}
            >
              <span className="material-symbols-outlined text-base" aria-hidden>
                inventory_2
              </span>
              Logs
            </Link>
          </div>
        </div>
      </nav>

      <div className="mt-auto pt-4">
        <p className="px-2 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Account
        </p>
        <div className="space-y-1 rounded-xl border border-border/60 bg-background p-2">
          <Link
            href="/interviews/account?tab=profile"
            className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          >
            <span className="material-symbols-outlined text-base" aria-hidden>
              person
            </span>
            Edit profile
          </Link>
          <Link
            href="/interviews/account?tab=security"
            className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          >
            <span className="material-symbols-outlined text-base" aria-hidden>
              lock
            </span>
            Security
          </Link>
          <Link
            href="/interviews/account?tab=billing"
            className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          >
            <span className="material-symbols-outlined text-base" aria-hidden>
              credit_card
            </span>
            Billing
          </Link>
        </div>
      </div>
    </aside>
  );
}
