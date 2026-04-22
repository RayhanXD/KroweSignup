import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createInterviewAuthClient } from "@/lib/supabaseAuth";
import { FEATURE_FLAGS } from "@/lib/featureFlags";
import InterviewsSidebar, { type SidebarNavKey } from "./InterviewsSidebar";
import InterviewsTopbar from "./InterviewsTopbar";

export type { SidebarNavKey };

type Props = {
  activeNav?: SidebarNavKey;
  topbarTitle?: string;
  topbarActions?: ReactNode;
  children: ReactNode;
  /** Route segment project id — enables "All projects" and keeps workspace links scoped to this project. */
  projectId?: string;
  noPadding?: boolean;
  /** Set true on pages that are valid destinations when the user has no project (e.g. /interviews/new). */
  allowWithoutProject?: boolean;
};

export default async function InterviewsShell({
  activeNav,
  topbarTitle,
  topbarActions,
  children,
  projectId: projectIdProp,
  noPadding,
  allowWithoutProject = false,
}: Props) {
  let projectId = projectIdProp;
  let granolaCount: number | undefined;
  let interviewCount: number | undefined;

  const supabase = await createInterviewAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!projectId && !allowWithoutProject) {
    if (user) {
      const { data } = await supabase
        .from("interview_projects")
        .select("id")
        .eq("user_id", user.id)
        .is("archived_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        projectId = data.id as string;
      } else {
        redirect("/interviews/new");
      }
    }
  }

  if (projectId && user) {
    const { data: projectData } = await supabase
      .from("interview_projects")
      .select("interview_count")
      .eq("id", projectId)
      .maybeSingle();
    interviewCount = (projectData as { interview_count: number } | null)?.interview_count ?? 0;
  }

  if (user && FEATURE_FLAGS.granolaImports) {
    const { count } = await supabase
      .from("granola_inbox_items")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("assignment_status", "unassigned");
    granolaCount = count ?? 0;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="w-full p-0">
        <div className="border border-border/60 bg-card shadow-soft">
          <div className="grid min-h-screen md:grid-cols-[240px_1fr]">
            <InterviewsSidebar activeNav={activeNav} projectId={projectId} granolaCount={granolaCount} interviewCount={interviewCount} />
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
