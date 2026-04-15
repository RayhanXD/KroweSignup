import type { ReactNode } from "react";
import InterviewsSidebar from "./InterviewsSidebar";
import InterviewsTopbar from "./InterviewsTopbar";

type SidebarNavKey = "home" | "create" | "imports" | "projects" | "usage" | "logs";

type Props = {
  activeNav: SidebarNavKey;
  topbarTitle?: string;
  topbarActions?: ReactNode;
  children: ReactNode;
};

export default function InterviewsShell({ activeNav, topbarTitle, topbarActions, children }: Props) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="w-full p-0">
        <div className="overflow-hidden border border-border/60 bg-card shadow-soft">
          <div className="grid min-h-screen md:grid-cols-[240px_1fr]">
            <InterviewsSidebar activeNav={activeNav} />
            <section className="p-3 sm:p-4">
              <InterviewsTopbar title={topbarTitle} actions={topbarActions} />
              {children}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
