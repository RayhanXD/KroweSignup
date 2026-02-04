/**
 * Competitors Section
 */

import type { Competitor } from "../findCompetitors";

type CompetitorsParams = {
  competitors: Competitor[];
};

export function buildCompetitorsSection(params: CompetitorsParams): string {
  const { competitors } = params;

  const competitorLines = competitors.length
    ? competitors.map((c: any) => `- **${c.name}** — ${c.why_competitor} (${c.url})`).join("\n")
    : `No competitors found yet`;

  return [
    `## 🥊 Top Competitors [testtest]`,
    competitorLines,
    ``,
  ].join("\n");
}
