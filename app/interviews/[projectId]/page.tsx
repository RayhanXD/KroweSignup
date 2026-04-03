import { createInterviewAuthClient } from "@/lib/supabaseAuth";
import { notFound } from "next/navigation";
import { ProjectPageClient } from "./ProjectPageClient";

export const dynamic = "force-dynamic";

type Interview = {
  id: string;
  status: "pending" | "structured" | "failed";
  created_at: string;
  interviewee_name: string | null;
  interviewee_context: string | null;
};

type Project = {
  id: string;
  name: string;
  status: "collecting" | "processing" | "ready" | "failed";
  interview_count: number;
  created_at: string;
  updated_at: string;
  session_id: string | null;
};

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createInterviewAuthClient();

  const [projectRes, interviewsRes] = await Promise.all([
    supabase
      .from("interview_projects")
      .select("id, name, status, interview_count, created_at, updated_at, session_id")
      .eq("id", projectId)
      .single(),
    supabase
      .from("interviews")
      .select("id, status, created_at, interviewee_name, interviewee_context")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true }),
  ]);

  if (projectRes.error || !projectRes.data) {
    notFound();
  }

  const project = projectRes.data as Project;
  const interviews = (interviewsRes.data ?? []) as Interview[];

  return (
    <ProjectPageClient
      project={project}
      interviews={interviews}
      projectId={projectId}
    />
  );
}
