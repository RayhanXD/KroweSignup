/**
 * Startup Advantage Score (SAS) Section
 */

type StartupAdvantageParams = {
  score: number;
  interpretation: string;
  missing: string[];
  components: {
    skill: number;
    age: number;
    costEff: number;
    productType: number;
    industry: number;
  };
};

export function buildStartupAdvantageSection(params: StartupAdvantageParams): string {
  const { score, interpretation, missing, components } = params;

  return [
    `## 🧩 Startup Advantage Score (SAS)`,
    `- **Score:** ${score}/100`,
    ``,
    `### Breakdown`,
    `- **Skill:** ${(components.skill * 100).toFixed(0)}%`,
    `- **Age:** ${(components.age * 100).toFixed(0)}%`,
    `- **Cost Efficiency:** ${(components.costEff * 100).toFixed(0)}%`,
    `- **Product Type:** ${(components.productType * 100).toFixed(0)}%`,
    `- **Industry:** ${(components.industry * 100).toFixed(0)}%`,
    ``,
  ].join("\n");
}
