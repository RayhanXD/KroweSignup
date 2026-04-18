import type { ReactNode } from "react";
import InterviewsSidebar from "./InterviewsSidebar";
import InterviewsTopbar from "./InterviewsTopbar";

type SidebarNavKey = "interviews" | "imports" | "usage" | "logs" | "script" | "decision" | "businessProfile";

type Props = {
  activeNav?: SidebarNavKey;
  topbarTitle?: string;
  topbarActions?: ReactNode;
  children: ReactNode;
  projectId?: string;
  noPadding?: boolean;
};

export default function InterviewsShell({ activeNav, topbarTitle, topbarActions, children, projectId, noPadding }: Props) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="w-full p-0">
        <div className="border border-border/60 bg-card shadow-soft">
          <div className="grid min-h-screen md:grid-cols-[240px_1fr]">
            <InterviewsSidebar activeNav={activeNav} projectId={projectId} />
            <section className={`flex flex-col ${noPadding ? "p-0" : "p-3 sm:p-4"}`}>
              <div className={noPadding ? "shrink-0 px-3 pt-3 sm:px-4 sm:pt-4" : "shrink-0"}>
                <InterviewsTopbar title={topbarTitle} actions={topbarActions} />
              </div>
              {children}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
