import Image from "next/image";
import Link from "next/link";
import { getUserPrimaryProjectId } from "@/lib/interviews/getUserPrimaryProjectId";

export type SidebarNavKey =
  | "projects"
  | "interviews"
  | "intel"
  | "feedback"
  | "workspace"
  | "script"
  | "businessProfile"
  | "decision"
  | "usage"
  | "logs"
  | "imports"
  | "addInterview"
  | "interview";

type NavItem = {
  key: SidebarNavKey;
  href: string;
  label: string;
  icon: string;
};

const manageNavItems: NavItem[] = [
  { key: "interviews", href: "/interviews", label: "Interviews", icon: "forum" },
  { key: "imports", href: "/interviews/imports", label: "Granola imports", icon: "download" },
  { key: "script", href: "/interviews/script", label: "Interview Script", icon: "description" },
];

function navClass(active: boolean): string {
  if (active) {
    return "flex items-center gap-2 rounded-lg bg-interview-brand-tint/70 px-2.5 py-2 text-sm font-medium text-interview-brand";
  }

  return "flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interview-brand/35";
}

export default async function InterviewsSidebar({
  activeNav,
  projectId,
  granolaCount,
}: {
  activeNav?: SidebarNavKey;
  /** When set, user is under `/interviews/[projectId]/…`; scoped links and “All projects” use this id. */
  projectId?: string;
  granolaCount?: number;
}) {
  const primaryProjectId = await getUserPrimaryProjectId();
  const linkProjectId = projectId ?? primaryProjectId;
  const inProjectRoute = Boolean(projectId);

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

      {inProjectRoute && projectId && (
        <Link
          href="/interviews/projects"
          className={`${navClass(false)} mb-3 text-sm`}
        >
          <span className="material-symbols-outlined text-base" aria-hidden>
            chevron_left
          </span>
          All projects
        </Link>
      )}

      <nav aria-label="Primary" className="flex flex-1 flex-col space-y-3">
        <div>
          <p className="px-2 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Platform
          </p>
          <div className="space-y-1">
            {manageNavItems.map((item) => (
              <Link key={item.key} href={item.href} className={navClass(activeNav === item.key)}>
                <span className="material-symbols-outlined text-base" aria-hidden>
                  {item.icon}
                </span>
                <span className="flex-1">{item.label}</span>
                {item.key === "imports" && granolaCount != null && granolaCount > 0 && (
                  <span className="ml-auto rounded-full bg-interview-brand-tint px-1.5 py-0.5 text-[10px] font-bold text-interview-brand">
                    {granolaCount}
                  </span>
                )}
              </Link>
            ))}
            <Link
              href={projectId ? `/interviews/${projectId}/business-profile` : "/interviews/projects"}
              className={navClass(activeNav === "businessProfile")}
            >
              <span className="material-symbols-outlined text-base" aria-hidden>
                workspaces
              </span>
              Projects
            </Link>
            <Link href="/interviews" className={navClass(activeNav === "intel")}>
              <span className="material-symbols-outlined text-base" aria-hidden>
                dashboard
              </span>
              Overview
            </Link>
            <Link href="/interviews/imports" className={navClass(activeNav === "imports")}>
              <span className="material-symbols-outlined text-base" aria-hidden>
                cloud_upload
              </span>
              Imports
            </Link>
            <Link href="/interviews/usage?range=24h" className={navClass(activeNav === "usage")}>
              <span className="material-symbols-outlined text-base" aria-hidden>
                insights
              </span>
              Usage
            </Link>
            <Link href="/interviews/logs" className={navClass(activeNav === "logs")}>
              <span className="material-symbols-outlined text-base" aria-hidden>
                inventory_2
              </span>
              Logs
            </Link>
            <Link href="/interviews/feedback" className={navClass(activeNav === "feedback")}>
              <span className="material-symbols-outlined text-base" aria-hidden>
                feedback
              </span>
              Feedback
            </Link>
          </div>
        </div>

        {linkProjectId && (
          <div>
            <p className="px-2 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Workspace
            </p>
            <div className="space-y-1">
              <Link
                href={`/interviews/${linkProjectId}`}
                className={navClass(activeNav === "workspace" || activeNav === "interview")}
              >
                <span className="material-symbols-outlined text-base" aria-hidden>
                  forum
                </span>
                Interviews
              </Link>
              <Link
                href={`/interviews/${linkProjectId}/script`}
                className={navClass(activeNav === "script")}
              >
                <span className="material-symbols-outlined text-base" aria-hidden>
                  description
                </span>
                Interview Script
              </Link>
              <Link
                href={`/interviews/${linkProjectId}/business-profile`}
                className={navClass(activeNav === "businessProfile")}
              >
                <span className="material-symbols-outlined text-base" aria-hidden>
                  apartment
                </span>
                Business Profile
              </Link>
              <Link
                href={`/interviews/${linkProjectId}/decision`}
                className={navClass(activeNav === "decision")}
              >
                <span className="material-symbols-outlined text-base" aria-hidden>
                  analytics
                </span>
                Decision
              </Link>
              <Link
                href={`/interviews/${linkProjectId}/add`}
                className={navClass(activeNav === "addInterview")}
              >
                <span className="material-symbols-outlined text-base" aria-hidden>
                  add_circle
                </span>
                Add interview
              </Link>
            </div>
          </div>
        )}
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
