export type InterviewSource = "granola" | "manual";

type InboxItem = { assigned_interview_id: string | null };

export function deriveSource(
  interviewId: string,
  granolaItems: InboxItem[]
): InterviewSource {
  return granolaItems.some((item) => item.assigned_interview_id === interviewId)
    ? "granola"
    : "manual";
}
