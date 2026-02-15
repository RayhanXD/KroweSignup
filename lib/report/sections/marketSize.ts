/**
 * Market Size Section
 */

import type { MarketSizeLLM } from "../marketsize";

type MarketSizeParams = {
  marketSize: MarketSizeLLM | null;
};

export function buildMarketSizeSection(params: MarketSizeParams): string {
  const { marketSize } = params;

  if (!marketSize) {
    return "";
  }

  const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;

  return [
    `## 🌍 Market Size`,
    `- **Planning Market Size:** ${fmt(marketSize.planning_market_size_usd_range.low)} - ${fmt(marketSize.planning_market_size_usd_range.high)} / year`,
    `- **TAM (Total Addressable):** ${fmt(marketSize.tam_usd_range.low)} - ${fmt(marketSize.tam_usd_range.high)} / year`,
    `- **SAM (Serviceable):** ${fmt(marketSize.sam_usd_range.low)} - ${fmt(marketSize.sam_usd_range.high)} / year`,
    `- **Initial Wedge:** ${fmt(marketSize.initial_wedge_usd_range.low)} - ${fmt(marketSize.initial_wedge_usd_range.high)} / year`,
    ``,
  ].join("\n");
}
