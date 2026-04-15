import Image from "next/image";
import Link from "next/link";
import { FEATURE_FLAGS } from "@/lib/featureFlags";

type SidebarNavKey = "home" | "create" | "imports" | "projects" | "usage" | "logs";

type NavItem = {
  key: SidebarNavKey;
  href: string;
  label: string;
  icon: string;
};

const workspaceNavItems: NavItem[] = [
  { key: "home", href: "/interviews", label: "Home", icon: "home" },
  { key: "create", href: "/interviews/new", label: "Create", icon: "add_circle" },
];

const manageNavItems: NavItem[] = [
  { key: "imports", href: "/interviews/imports", label: "Granola imports", icon: "import_contacts" },
  { key: "projects", href: "/interviews/projects", label: "Projects", icon: "folder_open" },
  { key: "usage", href: "/interviews/usage?range=24h", label: "Usage", icon: "insights" },
  { key: "logs", href: "/interviews/logs", label: "Logs", icon: "inventory_2" },
];

function navClass(active: boolean): string {
  if (active) {
    return "flex items-center gap-2 rounded-lg bg-interview-brand-tint/70 px-2.5 py-2 text-sm font-medium text-interview-brand";
  }

  return "flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interview-brand/35";
}

export default function InterviewsSidebar({ activeNav }: { activeNav: SidebarNavKey }) {
  return (
    <aside className="flex h-full flex-col border-r border-border/60 bg-[color-mix(in_srgb,var(--surface-subtle)_75%,white)] p-3">
      <div className="mb-3 flex items-center gap-2 rounded-xl border border-border/60 bg-background px-2.5 py-2">
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
      </div>

      <nav aria-label="Primary" className="space-y-3">
        <div>
          <p className="px-2 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Workspace
          </p>
          <div className="space-y-1">
            {workspaceNavItems.map((item) => (
              <Link key={item.key} href={item.href} className={navClass(activeNav === item.key)}>
                <span className="material-symbols-outlined text-base" aria-hidden>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <p className="px-2 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Manage
          </p>
          <div className="space-y-1">
            {manageNavItems
              .filter((item) => FEATURE_FLAGS.granolaImports || item.key !== "imports")
              .map((item) => (
                <Link key={item.key} href={item.href} className={navClass(activeNav === item.key)}>
                  <span className="material-symbols-outlined text-base" aria-hidden>
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              ))}
          </div>
        </div>
      </nav>

      <div className="mt-4 rounded-xl border border-border/60 bg-background p-3">
        <p className="text-xs font-semibold text-foreground">Run your next insight cycle</p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Start a new interview project and benchmark product signals.
        </p>
        <Link
          href="/interviews/new"
          className="mt-3 inline-flex w-full items-center justify-center rounded-md bg-gradient-to-br from-interview-brand to-interview-brand-end px-2.5 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-95"
        >
          New project
        </Link>
      </div>

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
