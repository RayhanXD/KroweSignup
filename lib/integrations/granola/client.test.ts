import { afterEach, describe, expect, it, vi } from "vitest";
import { listGranolaNotes } from "./client";

const API_BASE = "https://public-api.granola.ai/v1/notes";

describe("granola client list parser", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("parses canonical notes response shape", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          notes: [
            {
              id: "note_1",
              object: "note",
              title: "Get started with Granola",
              owner: { name: "Owner", email: "owner@example.com" },
              created_at: "2026-04-15T08:00:00Z",
              updated_at: "2026-04-15T09:00:00Z",
            },
          ],
          hasMore: true,
          cursor: "next_cursor",
        }),
        { status: 200 }
      )
    );

    const result = await listGranolaNotes("grn_test", { pageSize: 30 });
    expect(result.notes).toHaveLength(1);
    expect(result.notes[0].title).toBe("Get started with Granola");
    expect(result.hasMore).toBe(true);
    expect(result.cursor).toBe("next_cursor");
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${API_BASE}?page_size=30`,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer grn_test",
        }),
      })
    );
  });

  it("parses fallback response shape with snake_case fields", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            {
              id: "note_2",
              object: "note",
              title: "BIG DATA in Bio Lab",
              owner: { name: "Owner", email: "owner@example.com" },
              created_at: "2026-04-15T08:00:00Z",
              updated_at: "2026-04-15T09:00:00Z",
            },
          ],
          has_more: false,
          next_cursor: null,
        }),
        { status: 200 }
      )
    );

    const result = await listGranolaNotes("grn_test");
    expect(result.notes).toHaveLength(1);
    expect(result.notes[0].title).toBe("BIG DATA in Bio Lab");
    expect(result.hasMore).toBe(false);
    expect(result.cursor).toBeNull();
  });

  it("returns empty notes array for unknown list keys instead of crashing", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ unknown: [] }), { status: 200 })
    );

    const result = await listGranolaNotes("grn_test");
    expect(result.notes).toEqual([]);
    expect(result.hasMore).toBe(false);
    expect(result.cursor).toBeNull();
  });

  it("supports optional live account check when key is provided", async () => {
    const liveKey = process.env.GRANOLA_LIVE_API_KEY?.trim();
    if (!liveKey) {
      expect(true).toBe(true);
      return;
    }

    const expectedTitles = (
      process.env.GRANOLA_EXPECTED_TITLES ??
      "Get started with Granola,BIG DATA in Bio Lab,JPMorganChase Freshman Focus,AMOS LABS - Convergent,Sophomore Roundtable #1"
    )
      .split(",")
      .map((title) => title.trim())
      .filter(Boolean);

    const result = await listGranolaNotes(liveKey, { pageSize: 50 });
    const titles = result.notes.map((note) => (note.title ?? "").trim()).filter(Boolean);

    expect(titles.length).toBeGreaterThan(0);

    const matchedCount = expectedTitles.filter((expected) =>
      titles.some((actual) => actual.toLowerCase().includes(expected.toLowerCase()))
    ).length;

    expect(matchedCount).toBeGreaterThan(0);
  });
});
