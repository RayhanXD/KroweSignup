import type {
  GranolaInboxUpsert,
  GranolaNote,
  GranolaTranscriptLine,
} from "./types";

function lineForTranscript(item: GranolaTranscriptLine): string {
  const speaker = item.speaker.diarization_label || item.speaker.source || "speaker";
  return `${speaker}: ${item.text}`;
}

export function buildTranscriptPreview(note: GranolaNote, maxLength = 400): string {
  const transcriptText =
    note.transcript?.map((item) => item.text).join(" ").trim() || note.summary_text || "";
  if (transcriptText.length <= maxLength) return transcriptText;
  return `${transcriptText.slice(0, maxLength).trim()}...`;
}

export function buildNormalizedInterviewText(note: GranolaNote): string {
  const title = note.title || "Untitled interview";
  const when =
    note.calendar_event?.scheduled_start_time || note.created_at || new Date().toISOString();
  const attendees = (note.attendees ?? [])
    .map((a) => a.name || a.email)
    .filter(Boolean)
    .join(", ");
  const transcriptLines = (note.transcript ?? []).map(lineForTranscript).join("\n");

  return [
    `Interview: ${title}`,
    `Date: ${when}`,
    attendees ? `Attendees: ${attendees}` : null,
    "",
    "Summary:",
    note.summary_text || "(No summary)",
    "",
    "Transcript:",
    transcriptLines || "(No transcript)",
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n")
    .trim();
}

export function normalizeGranolaNote(note: GranolaNote): GranolaInboxUpsert {
  return {
    external_note_id: note.id,
    granola_updated_at: note.updated_at,
    granola_created_at: note.created_at,
    title: note.title,
    owner_name: note.owner?.name ?? null,
    owner_email: note.owner?.email ?? null,
    attendees: (note.attendees ?? []).map((attendee) => ({
      name: attendee.name,
      email: attendee.email,
    })),
    details: {
      calendar_event: note.calendar_event,
      folder_membership: note.folder_membership,
      object: note.object,
    },
    summary_text: note.summary_text ?? null,
    summary_markdown: note.summary_markdown ?? null,
    transcript_preview: buildTranscriptPreview(note),
    normalized_text: buildNormalizedInterviewText(note),
  };
}
