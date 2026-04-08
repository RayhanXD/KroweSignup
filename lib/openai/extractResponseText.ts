/**
 * Parse assistant text from OpenAI Responses API-shaped objects.
 */

export function extractResponseText(response: unknown): string {
  const candidate = response as {
    output_text?: unknown;
    output?: Array<{
      content?: Array<{ type?: string; text?: unknown }>;
      type?: string;
    }>;
  };

  if (typeof candidate?.output_text === "string" && candidate.output_text.trim()) {
    return candidate.output_text.trim();
  }

  const out = candidate?.output;
  if (Array.isArray(out)) {
    for (const item of out) {
      const content = item?.content;
      if (!Array.isArray(content)) continue;

      for (const c of content) {
        const t = c?.text;
        if (typeof t === "string" && t.trim()) {
          return t.trim();
        }
      }
    }
  }

  if (Array.isArray(out)) {
    for (const item of out) {
      const content = item?.content;
      if (!Array.isArray(content)) continue;

      for (const c of content) {
        if (c?.type === "output_text" && typeof (c as { text?: unknown }).text === "string") {
          const t = (c as { text: string }).text.trim();
          if (t) return t;
        }
      }
    }
  }

  return "";
}
