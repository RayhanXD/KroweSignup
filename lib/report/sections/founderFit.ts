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
  ].join("\n");
}
