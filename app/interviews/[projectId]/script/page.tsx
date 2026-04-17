import { createInterviewAuthClient } from "@/lib/supabaseAuth";
import { notFound } from "next/navigation";
import InterviewsShell from "@/app/interviews/_components/InterviewsShell";
import { InterviewScriptTab } from "../InterviewScriptTab";

export const dynamic = "force-dynamic";

export default async function InterviewScriptPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createInterviewAuthClient();

  const { data: project, error } = await supabase
    .from("interview_projects")
    .select("id, name")
    .eq("id", projectId)
    .single();

  if (error || !project) notFound();

  return (
    <InterviewsShell activeNav="script" projectId={projectId} topbarTitle="Interview Script">
      <InterviewScriptTab projectId={projectId} projectName={project.name} />
    </InterviewsShell>
  );
}
