import { createInterviewAuthClient } from "@/lib/supabaseAuth";
import { notFound } from "next/navigation";
import InterviewsShell from "@/app/interviews/_components/InterviewsShell";
import { BusinessProfileTab } from "../BusinessProfileTab";

export const dynamic = "force-dynamic";

export default async function BusinessProfilePage({
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
    <InterviewsShell activeNav="businessProfile" projectId={projectId} topbarTitle="Business Profile">
      <BusinessProfileTab projectId={projectId} />
    </InterviewsShell>
  );
}
