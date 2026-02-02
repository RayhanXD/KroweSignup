/**
 * Market Size Section
 */

import type { MarketSizeLLM } from "../marketsize";
import { fmtUSD } from "../../utils/formatting";

type MarketSizeParams = {
  marketSize: MarketSizeLLM | null;
};

export function buildMarketSizeSection(params: MarketSizeParams): string {
  const { marketSize } = params;

  if (!marketSize) {
    return "";
  }

  const fmt = (n: number) => `$${n.toLocaleString()}`;

  const y1 = marketSize.planning_year_1;

  return [
    `## 🌍 Market Size`,
    `- **Definition:** ${marketSize.market_definition}`,
    `- **TAM (Total Addressable):** ${fmt(marketSize.tam_usd_range.low)} - ${fmt(marketSize.tam_usd_range.high)} / year`,
    `- **SAM (Serviceable):** ${fmt(marketSize.sam_usd_range.low)} - ${fmt(marketSize.sam_usd_range.high)} / year`,
    `- **Wedge:** ${fmt(marketSize.wedge_sam_usd_range.low)} - ${fmt(marketSize.wedge_sam_usd_range.high)} / year`,
    ``,
    `### 📅 Planning Market Size (Year 1)`,
    `- **Target Revenue:** ${fmt(y1.target_revenue_usd.low)} - ${fmt(y1.target_revenue_usd.high)}`,
    `- **Customer Count:** ${y1.customer_count.low.toLocaleString()} - ${y1.customer_count.high.toLocaleString()}`,+
    `- **Notes:** ${marketSize.notes?.[0] || ""}`,
    ``,
  ].join("\n");
}
