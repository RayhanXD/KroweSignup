export type GranolaUser = {
  name: string | null;
  email: string;
};

export type GranolaTranscriptLine = {
  speaker: {
    source: "microphone" | "speaker";
    diarization_label?: string;
  };
  text: string;
  start_time?: string;
  end_time?: string;
};

export type GranolaNoteSummary = {
  id: string;
  object: "note";
  title: string | null;
  owner: GranolaUser;
  created_at: string;
  updated_at: string;
};

export type GranolaListNotesResponse = {
  notes: GranolaNoteSummary[];
  hasMore: boolean;
  cursor: string | null;
};

export type GranolaNote = GranolaNoteSummary & {
  attendees: GranolaUser[];
  summary_text: string;
  summary_markdown: string | null;
  transcript: GranolaTranscriptLine[] | null;
  calendar_event: {
    event_title: string | null;
    organiser: string | null;
    scheduled_start_time: string | null;
    scheduled_end_time: string | null;
  } | null;
  folder_membership: Array<{ id: string; object: "folder"; name: string }>;
};

export type GranolaInboxUpsert = {
  external_note_id: string;
  granola_updated_at: string;
  granola_created_at: string | null;
  title: string | null;
  owner_name: string | null;
  owner_email: string | null;
  attendees: Array<{ name: string | null; email: string }>;
  details: Record<string, unknown>;
  summary_text: string | null;
  summary_markdown: string | null;
  transcript_preview: string;
  normalized_text: string;
};
