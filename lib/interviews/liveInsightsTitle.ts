const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "in",
  "into",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "their",
  "this",
  "to",
  "with",
]);

const FALLBACK_TITLE = "Untitled Cluster";
const WORD_LIMIT = 3;

function normalizeToken(token: string): string {
  return token.replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, "");
}

function toTitleCase(word: string): string {
  if (!word) return "";
  return word[0].toUpperCase() + word.slice(1).toLowerCase();
}

export function toLiveInsightsClusterTitle(canonicalProblem: string): string {
  const normalized = canonicalProblem.trim().replace(/\s+/g, " ");
  if (!normalized) return FALLBACK_TITLE;

  const rawTokens = normalized
    .split(" ")
    .map((t) => normalizeToken(t))
    .filter(Boolean);

  if (rawTokens.length === 0) return FALLBACK_TITLE;

  const meaningfulTokens = rawTokens.filter((token) => !STOP_WORDS.has(token.toLowerCase()));
  const picked = meaningfulTokens.slice(0, WORD_LIMIT);

  if (picked.length < WORD_LIMIT) {
    for (const token of rawTokens) {
      if (picked.length >= WORD_LIMIT) break;
      if (!picked.includes(token)) picked.push(token);
    }
  }

  return picked.slice(0, WORD_LIMIT).map(toTitleCase).join(" ");
}
