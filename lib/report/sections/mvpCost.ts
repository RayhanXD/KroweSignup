/**
 * Estimated MVP Cost Section
 */

import type { MvpCostEstimate } from "../estimateMvpCost";

type MvpCostParams = {
  costEstimate: MvpCostEstimate | null;
};

export function buildMvpCostSection(params: MvpCostParams): string {
  const { costEstimate } = params;

  if (!costEstimate) {
    return [
      `## 💸 Estimated MVP Cost`,
      `- ⚠ Cost estimate unavailable`,
      ``,
    ].join("\n");
  }

  return [
    `## 💸 Estimated MVP Cost`,
    `- **Range:** $${Math.round(costEstimate.cost_low_usd).toLocaleString()} – $${Math.round(costEstimate.cost_high_usd).toLocaleString()}`,
    `- **Cost Efficiency Score:** ${Math.round(costEstimate.cost_efficiency_score_0_1 * 100)}/100`,
    `- **Confidence:** ${Math.round(costEstimate.confidence_0_1 * 100)}%`,
    `- **Recommended MVP scope:** ${costEstimate.recommended_mvp_scope}`,
    ``,
    ...(costEstimate.key_cost_drivers?.length
      ? [`### Key cost drivers`, ...costEstimate.key_cost_drivers.map((d: string) => `- ${d}`), ``]
      : []),
    ``,
  ].join("\n");
}
