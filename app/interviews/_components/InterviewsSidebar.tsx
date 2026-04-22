import Image from "next/image";
import Link from "next/link";
import LogoutButton from "@/app/interviews/LogoutButton";

export type SidebarNavKey =
  | "projects"
  | "interviews"
  | "intel"
  | "feedback"
  | "workspace"
  | "script"
  | "businessProfile"
  | "decision"
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
  { key: "imports", href: "/interviews/imports", label: "Granola imports", icon: "download" },
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
  granolaCount,
  interviewCount,
}: {
  activeNav?: SidebarNavKey;
  /** When set, user is under `/interviews/[projectId]/…`; scoped links and “All projects” use this id. */
  projectId?: string;
  granolaCount?: number;
  interviewCount?: number;
}) {
  const linkProjectId = projectId;
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

<nav aria-label="Primary" className="flex flex-1 flex-col space-y-3">
        <div>
          <p className="px-2 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Workspace
          </p>
          <div className="space-y-1">
            <Link
              href="/interviews/projects"
              className={navClass(activeNav === "projects")}
            >
              <span className="material-symbols-outlined text-base" aria-hidden>
                workspaces
              </span>
              Home
            </Link>
            {linkProjectId && (
              <>
                <Link
                  href={`/interviews/${linkProjectId}`}
                  className={navClass(activeNav === "workspace" || activeNav === "interview")}
                >
                  <span className="material-symbols-outlined text-base" aria-hidden>
                    forum
                  </span>
                  <span className="flex-1">Interviews</span>
                  {interviewCount != null && interviewCount > 0 && (
                    <span className="ml-auto rounded-full bg-interview-brand-tint px-1.5 py-0.5 text-[10px] font-bold text-interview-brand">
                      {interviewCount}
                    </span>
                  )}
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
              </>
            )}
          </div>
        </div>

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
                {item.key === "imports" && granolaCount != null && (
                  <span className="ml-auto rounded-full bg-interview-brand-tint px-1.5 py-0.5 text-[10px] font-bold text-interview-brand">
                    {granolaCount}
                  </span>
                )}
              </Link>
            ))}
            <Link href="/interviews/feedback" className={navClass(activeNav === "feedback")}>
              <span className="material-symbols-outlined text-base" aria-hidden>
                feedback
              </span>
              Feedback
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
            href="/interviews/account"
            className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          >
            <span className="material-symbols-outlined text-base" aria-hidden>
              settings
            </span>
            Settings
          </Link>
          <LogoutButton />
        </div>
      </div>
    </aside>
  );
}
