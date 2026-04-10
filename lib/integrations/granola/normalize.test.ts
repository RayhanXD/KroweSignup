import { describe, expect, it } from "vitest";
import {
  buildNormalizedInterviewText,
  buildTranscriptPreview,
  normalizeGranolaNote,
} from "./normalize";
import type { GranolaNote } from "./types";

const sampleNote: GranolaNote = {
  id: "not_1d3tmYTlCICgjy",
  object: "note",
  title: "Discovery call",
  owner: { name: "Alex", email: "alex@example.com" },
  created_at: "2026-04-01T10:00:00Z",
  updated_at: "2026-04-01T11:00:00Z",
  attendees: [{ name: "Taylor", email: "taylor@example.com" }],
  summary_text: "The customer struggles with onboarding and activation.",
  summary_markdown: "## Summary",
  calendar_event: {
    event_title: "Discovery call",
    organiser: "alex@example.com",
    scheduled_start_time: "2026-04-01T10:00:00Z",
    scheduled_end_time: "2026-04-01T10:30:00Z",
  },
  folder_membership: [{ id: "fol_4y6LduVdwSKC27", object: "folder", name: "Calls" }],
  transcript: [
    { speaker: { source: "microphone", diarization_label: "Speaker A" }, text: "Hello there." },
    { speaker: { source: "speaker" }, text: "We have onboarding issues." },
  ],
};

describe("granola normalize helpers", () => {
  it("builds transcript preview from transcript text", () => {
    const preview = buildTranscriptPreview(sampleNote, 25);
    expect(preview).toContain("Hello there");
    expect(preview.endsWith("...")).toBe(true);
  });

  it("builds normalized text with summary and transcript", () => {
    const text = buildNormalizedInterviewText(sampleNote);
    expect(text).toContain("Interview: Discovery call");
    expect(text).toContain("Summary:");
    expect(text).toContain("Transcript:");
    expect(text).toContain("Speaker A: Hello there.");
  });

  it("normalizes note payload for inbox upsert", () => {
    const normalized = normalizeGranolaNote(sampleNote);
    expect(normalized.external_note_id).toBe(sampleNote.id);
    expect(normalized.owner_email).toBe("alex@example.com");
    expect(normalized.attendees).toHaveLength(1);
    expect(normalized.normalized_text.length).toBeGreaterThan(50);
  });
});
