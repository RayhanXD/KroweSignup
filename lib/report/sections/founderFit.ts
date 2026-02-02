/**
 * Founder Fit Score (FFS) Section
 */

type FounderFitParams = {
  score: number;
  category: string;
  missing: string[];
  components: {
    skill: number;
    age: number;
    cost: number;
    industry: number;
  };
};

export function buildFounderFitSection(params: FounderFitParams): string {
  const { score, category, missing, components } = params;

  const whatThisMeans = category === "strong fit "
    ? "You have the right foundation to execute quickly and learn fast."
    : category === "partial fit "
      ? "You can absolutely proceed, but execution will require tighter focus and support in weaker areas."
      : "This idea may still work, but your current profile suggests high execution risk without major changes.";

  const recommendation = category === "strong fit "
    ? "Proceed with a tight MVP scope and start user interviews immediately."
    : category === "partial fit "
      ? "Narrow the MVP scope and fill 1 key gap (skill or industry experience) before building too much."
      : "Consider pivoting to a simpler version of the idea or adding a cofounder/mentor to cover gaps before building.";

  return [
    `## 👤 Founder Fit (FFS)`,
    `- **Score:** ${score}/100`,
    `- **Category:** ${category}`,
    ``,
    `### Breakdown`,
    `- **Skill Score:** ${(components.skill * 100).toFixed(0)}%`,
    `- **Industry Familiarity:** ${(components.industry * 100).toFixed(0)}%`,
    `- **Age Factor:** ${(components.age * 100).toFixed(0)}%`,
    `- **Cost Alignment:** ${(components.cost * 100).toFixed(0)}%`,
    ``,
    `### What this means`,
    `- ${whatThisMeans}`,
    ``,
    `### Recommendation`,
    `- ${recommendation}`,
    ``,
  ].join("\n");
}
