/**
 * Shared report generation pipeline
 *
 * This function encapsulates the full report generation flow:
 * 1. Load answers from signup_answers
 * 2. Map inputs to expected payload structure
 * 3. Run all LLM enrichment modules (competitors, MVP cost, market size)
 * 4. Build the final report
 * 5. Persist to signup_reports
 *
 * Used by both /api/signup/report/generate and /api/signup/report/refresh
 */

import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { buildInputsFromAnswers } from "./buildInputsFromAnswers";
import { mapSignupInputsToReportInputs } from "./mapSignupInputsToReportInputs";
import { buildReportFromPayload } from "./buildReport";
import { findCompetitorsViaWeb, type Competitor } from "./findCompetitors";
import { estimateMvpCostViaLLM, type MvpCostEstimate } from "./estimateMvpCost";
import { estimateMarketSizeLLM, type MarketSizeLLM } from "./marketsize";
import { computeThingsNeededLLM, type ThingsNeededResult } from "./thingsNeeded";
import { REPORT_VERSION } from "@/lib/constants";

export type GenerateReportOptions = {
  /** Reason for generation - used for logging/debugging */
  reason?: "generate" | "refresh";
  /** Skip version/status checks (for refresh) */
  forceRegenerate?: boolean;
};

export type GenerateReportResult = {
  report: ReturnType<typeof buildReportFromPayload>;
  updatedAt: string;
  reportId?: string;
  /** Debug info about enrichment modules */
  enrichmentDebug?: {
    competitorCount: number;
    competitorError?: string;
    hasCostEstimate: boolean;
    hasMarketSize: boolean;
  };
};

/**
 * Generate a full report for a session, including all LLM enrichment.
 *
 * @param sessionId - The session ID to generate report for
 * @param opts - Options for generation
 * @returns The generated report and metadata
 */
export async function generateReportForSession(
  sessionId: string,
  opts: GenerateReportOptions = {}
): Promise<GenerateReportResult> {
  const { reason = "generate", forceRegenerate = false } = opts;
  const supabase = createServerSupabaseClient();

  console.log(`[generateReportForSession] Starting (reason: ${reason}) for session: ${sessionId}`);

  // 1) Load answers from signup_answers
  const { data: answers, error: answersError } = await supabase
    .from("signup_answers")
    .select("step_key, final_answer")
    .eq("session_id", sessionId);

  if (answersError) {
    console.error("[generateReportForSession] Failed to load answers:", answersError);
    throw new Error(`Failed to load signup answers: ${answersError.message}`);
  }

  if (!answers || answers.length === 0) {
    throw new Error("No answers found for session");
  }

  // 2) Build and map inputs
  const rawInputs = buildInputsFromAnswers(answers);
  const mappedPayload = mapSignupInputsToReportInputs(rawInputs);

  // Extract key values for LLM calls
  const idea = rawInputs.idea ?? null;
  const industry = rawInputs.industry ?? null;
  const targetCustomer = rawInputs.target_customer ?? null;
  const problem = rawInputs.problem ?? null;
  const productType = rawInputs.product_type ?? null;
  const teamSize = rawInputs.team_size ? parseInt(rawInputs.team_size, 10) : null;
  const hoursPerWeek = rawInputs.hours ? parseInt(rawInputs.hours, 10) : null;

  console.log(`[generateReportForSession] Loaded ${answers.length} answers, idea: "${idea?.slice(0, 50)}..."`);

  // 3) Run LLM enrichment modules
  let competitors: Competitor[] = [];
  let competitorError: string | undefined;
  let costEstimate: MvpCostEstimate | null = null;
  let mvpCostEstimateError: string | undefined;
  let marketSize: MarketSizeLLM | null = null;
  let thingsNeeded: ThingsNeededResult | null = null;

  // 3a) Find competitors via web search
  if (idea && industry) {
    try {
      console.log(`[generateReportForSession] Running competitor search...`);
      const res = await findCompetitorsViaWeb({ idea, industry, targetCustomer });
      competitors = res.competitors ?? [];
      console.log(`[generateReportForSession] Found ${competitors.length} competitors`);
    } catch (e: any) {
      competitorError = e?.message || "Competitor search failed";
      console.error("[generateReportForSession] Competitor search error:", competitorError);
      competitors = [];
    }
  } else {
    console.log("[generateReportForSession] Skipping competitor search (missing idea or industry)");
  }

  // 3b) Estimate MVP cost
  if (idea) {
    try {
      console.log(`[generateReportForSession] Running MVP cost estimation...`);
      costEstimate = await estimateMvpCostViaLLM({
        idea,
        industry,
        productType,
        targetCustomer,
        teamSize,
        hoursPerWeek,
      });
      console.log(`[generateReportForSession] MVP cost estimate: $${costEstimate?.cost_mid_usd}`);
    } catch (e: any) {
      costEstimate = null;
      mvpCostEstimateError = e?.message || "Failed to estimate MVP cost";
      console.error("[generateReportForSession] MVP cost error:", mvpCostEstimateError);
    }
  } else {
    console.log("[generateReportForSession] Skipping MVP cost (missing idea)");
  }

  // 3c) Estimate market size
  console.log(`[generateReportForSession] Running market size estimation...`);
  try {
    marketSize = await estimateMarketSizeLLM({
      idea,
      problem,
      targetCustomer,
      industry,
      competitors: competitors.map((c) => ({ name: c.name })),
    });
    console.log(`[generateReportForSession] Market size confidence: ${marketSize?.confidence ?? "N/A"}`);
  } catch (e: any) {
    console.error("[generateReportForSession] Market size error:", e?.message);
    marketSize = null;
  }

  // 3d) Generate things needed via LLM
  console.log(`[generateReportForSession] Running things needed generation...`);
  try {
    thingsNeeded = await computeThingsNeededLLM({
      idea,
      productType,
      targetCustomer,
      industry,
      problem,
      skillsRaw: rawInputs.skills ?? null,
      teamSize,
      hours: hoursPerWeek,
    });
    console.log(`[generateReportForSession] Things needed: ${thingsNeeded?.needs.length ?? 0} needs, ${thingsNeeded?.gaps.length ?? 0} gaps`);
  } catch (e: any) {
    console.error("[generateReportForSession] Things needed error:", e?.message);
    thingsNeeded = null;
  }

  // 4) Build the report
  console.log(`[generateReportForSession] Building report...`);
  const report = buildReportFromPayload(mappedPayload, {
    competitors,
    competitorError,
    costEstimate,
    mvpCostEstimateError,
    marketSize,
    thingsNeeded,
  });

  // Ensure version is set
  if (report) {
    (report as any).version = REPORT_VERSION;
  }

  // 5) Persist to signup_reports (upsert)
  const updatedAt = new Date().toISOString();

  const { data: upserted, error: upsertError } = await supabase
    .from("signup_reports")
    .upsert(
      {
        session_id: sessionId,
        status: "ready",
        report,
        updated_at: updatedAt,
      },
      { onConflict: "session_id" }
    )
    .select("id")
    .single();

  if (upsertError) {
    console.error("[generateReportForSession] Failed to save report:", upsertError);
    throw new Error(`Failed to save report: ${upsertError.message}`);
  }

  console.log(`[generateReportForSession] Report saved successfully (reason: ${reason})`);

  // Debug log for enrichment verification
  const enrichmentDebug = {
    competitorCount: competitors.length,
    competitorError,
    hasCostEstimate: costEstimate !== null,
    hasMarketSize: marketSize !== null,
    hasThingsNeeded: thingsNeeded !== null,
  };
  console.log(`[generateReportForSession] Enrichment debug:`, enrichmentDebug);

  return {
    report,
    updatedAt,
    reportId: upserted?.id,
    enrichmentDebug,
  };
}
