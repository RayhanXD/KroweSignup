import type {
  GranolaListNotesResponse,
  GranolaNote,
  GranolaNoteSummary,
} from "./types";

const GRANOLA_API_BASE_URL = "https://public-api.granola.ai/v1";

type ListOptions = {
  cursor?: string;
  updatedAfter?: string;
  pageSize?: number;
};

function normalizeListResponse(payload: unknown): GranolaListNotesResponse {
  if (!payload || typeof payload !== "object") {
    throw new Error("Granola API returned an invalid list response");
  }

  const raw = payload as Record<string, unknown>;
  const notesValue = Array.isArray(raw.notes)
    ? raw.notes
    : Array.isArray(raw.data)
      ? raw.data
      : Array.isArray(raw.items)
        ? raw.items
        : [];

  const hasMoreRaw = raw.hasMore ?? raw.has_more ?? raw.hasNextPage ?? raw.has_next_page;
  const cursorRaw = raw.cursor ?? raw.next_cursor ?? raw.nextCursor ?? null;

  return {
    notes: notesValue as GranolaNoteSummary[],
    hasMore: Boolean(hasMoreRaw),
    cursor: typeof cursorRaw === "string" ? cursorRaw : null,
  };
}

async function granolaRequest<T>(apiKey: string, path: string): Promise<T> {
  let attempt = 0;
  while (attempt < 3) {
    attempt += 1;
    const res = await fetch(`${GRANOLA_API_BASE_URL}${path}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (res.ok) {
      return (await res.json()) as T;
    }

    if (res.status === 429 && attempt < 3) {
      const retryAfter = Number(res.headers.get("retry-after") ?? "1");
      await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
      continue;
    }

    const body = await res.text();
    const msg = body || `Granola API error (${res.status})`;
    throw new Error(msg);
  }

  throw new Error("Granola API request failed after retries");
}

export async function listGranolaNotes(
  apiKey: string,
  options: ListOptions = {}
): Promise<GranolaListNotesResponse> {
  const params = new URLSearchParams();
  if (options.cursor) params.set("cursor", options.cursor);
  if (options.updatedAfter) params.set("updated_after", options.updatedAfter);
  if (options.pageSize) params.set("page_size", String(options.pageSize));

  const query = params.toString();
  const payload = await granolaRequest<unknown>(apiKey, `/notes${query ? `?${query}` : ""}`);
  return normalizeListResponse(payload);
}

export async function getGranolaNote(apiKey: string, noteId: string): Promise<GranolaNote> {
  return granolaRequest<GranolaNote>(
    apiKey,
    `/notes/${encodeURIComponent(noteId)}?include=transcript`
  );
}

export async function verifyGranolaConnection(apiKey: string): Promise<GranolaNoteSummary[] | null> {
  const res = await listGranolaNotes(apiKey, { pageSize: 1 });
  if (!Array.isArray(res.notes)) {
    throw new Error("Granola API returned an invalid notes payload");
  }
  return res.notes;
}
