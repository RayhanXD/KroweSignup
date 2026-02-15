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

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

type TimedTaskResult<T> =
  | { status: "fulfilled"; value: T; durationMs: number }
  | { status: "rejected"; reason: unknown; durationMs: number };

async function runTimedTask<T>(name: string, task: () => Promise<T>): Promise<TimedTaskResult<T>> {
  const startedAt = Date.now();
  try {
    const value = await task();
    const durationMs = Date.now() - startedAt;
    console.log(`[generateReportForSession] ${name} completed in ${durationMs}ms`);
    return { status: "fulfilled", value, durationMs };
  } catch (reason: unknown) {
    const durationMs = Date.now() - startedAt;
    console.warn(`[generateReportForSession] ${name} failed in ${durationMs}ms`);
    return { status: "rejected", reason, durationMs };
  }
}

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
  const { reason = "generate" } = opts;
  const supabase = createServerSupabaseClient();
  const pipelineStartedAt = Date.now();

  console.log(`[generateReportForSession] Starting (reason: ${reason}) for session: ${sessionId}`);

  // 1) Load answers from signup_answers
  const answersQueryStartedAt = Date.now();
  const { data: answers, error: answersError } = await supabase
    .from("signup_answers")
    .select("step_key, final_answer")
    .eq("session_id", sessionId);

  if (answersError) {
    console.error(
      `[generateReportForSession] Failed to load answers after ${Date.now() - answersQueryStartedAt}ms:`,
      answersError
    );
    throw new Error(`Failed to load signup answers: ${answersError.message}`);
  }

  if (!answers || answers.length === 0) {
    console.error(
      `[generateReportForSession] No answers found after ${Date.now() - answersQueryStartedAt}ms`
    );
    throw new Error("No answers found for session");
  }
  console.log(
    `[generateReportForSession] Loaded ${answers.length} answers in ${Date.now() - answersQueryStartedAt}ms`
  );

  // 2) Build and map inputs
  const mapInputsStartedAt = Date.now();
  const rawInputs = buildInputsFromAnswers(answers);
  const mappedPayload = mapSignupInputsToReportInputs(rawInputs);
  console.log(
    `[generateReportForSession] Built and mapped inputs in ${Date.now() - mapInputsStartedAt}ms`
  );

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

  // 3) Run enrichment modules in parallel
  const enrichmentStartedAt = Date.now();
  const [competitorResult, mvpCostResult, marketSizeResult, thingsNeededResult] = await Promise.all([
    runTimedTask("Competitor search", async () => {
      if (!idea || !industry) {
        console.log("[generateReportForSession] Skipping competitor search (missing idea or industry)");
        return { competitors: [] as Competitor[] };
      }

      return findCompetitorsViaWeb({ idea, industry, targetCustomer });
    }),
    runTimedTask("MVP cost estimation", async () => {
      if (!idea) {
        console.log("[generateReportForSession] Skipping MVP cost (missing idea)");
        return null;
      }

      return estimateMvpCostViaLLM({
        idea,
        industry,
        productType,
        targetCustomer,
        teamSize,
        hoursPerWeek,
      });
    }),
    runTimedTask("Market size estimation", async () =>
      estimateMarketSizeLLM({
        idea,
        problem,
        targetCustomer,
        industry,
        // Step 2: market size no longer waits on competitor lookup.
        competitors: [],
      })
    ),
    runTimedTask("Things needed generation", async () =>
      computeThingsNeededLLM({
        idea,
        productType,
        targetCustomer,
        industry,
        problem,
        skillsRaw: rawInputs.skills ?? null,
        teamSize,
        hours: hoursPerWeek,
      })
    ),
  ]);

  if (competitorResult.status === "fulfilled") {
    competitors = competitorResult.value.competitors ?? [];
    console.log(
      `[generateReportForSession] Found ${competitors.length} competitors (${competitorResult.durationMs}ms)`
    );
  } else {
    competitorError = errorMessage(competitorResult.reason, "Competitor search failed");
    competitors = [];
    console.error(
      `[generateReportForSession] Competitor search error after ${competitorResult.durationMs}ms:`,
      competitorError
    );
  }

  if (mvpCostResult.status === "fulfilled") {
    costEstimate = mvpCostResult.value;
    if (costEstimate) {
      console.log(
        `[generateReportForSession] MVP cost estimate: $${costEstimate.cost_mid_usd} (${mvpCostResult.durationMs}ms)`
      );
    } else {
      console.log(`[generateReportForSession] MVP cost unavailable (${mvpCostResult.durationMs}ms)`);
    }
  } else {
    costEstimate = null;
    mvpCostEstimateError = errorMessage(mvpCostResult.reason, "Failed to estimate MVP cost");
    console.error(
      `[generateReportForSession] MVP cost error after ${mvpCostResult.durationMs}ms:`,
      mvpCostEstimateError
    );
  }

  if (marketSizeResult.status === "fulfilled") {
    marketSize = marketSizeResult.value;
    console.log(
      `[generateReportForSession] Market size available: ${marketSize !== null} (${marketSizeResult.durationMs}ms)`
    );
  } else {
    marketSize = null;
    console.error(
      `[generateReportForSession] Market size error after ${marketSizeResult.durationMs}ms:`,
      errorMessage(marketSizeResult.reason, "Market size failed")
    );
  }

  if (thingsNeededResult.status === "fulfilled") {
    thingsNeeded = thingsNeededResult.value;
    console.log(
      `[generateReportForSession] Things needed: ${thingsNeeded?.needs.length ?? 0} needs (${thingsNeededResult.durationMs}ms)`
    );
  } else {
    thingsNeeded = null;
    console.error(
      `[generateReportForSession] Things needed error after ${thingsNeededResult.durationMs}ms:`,
      errorMessage(thingsNeededResult.reason, "Things needed failed")
    );
  }
  console.log(
    `[generateReportForSession] Enrichment phase completed in ${Date.now() - enrichmentStartedAt}ms`
  );

  // 4) Build the report
  const buildReportStartedAt = Date.now();
  console.log(`[generateReportForSession] Building report...`);
  const report = buildReportFromPayload(mappedPayload, {
    competitors,
    competitorError,
    costEstimate,
    mvpCostEstimateError,
    marketSize,
    thingsNeeded,
  });
  console.log(`[generateReportForSession] Report object built in ${Date.now() - buildReportStartedAt}ms`);

  // 5) Persist to signup_reports (upsert)
  const updatedAt = new Date().toISOString();
  const saveReportStartedAt = Date.now();

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

  console.log(
    `[generateReportForSession] Report saved in ${Date.now() - saveReportStartedAt}ms (reason: ${reason})`
  );

  // Debug log for enrichment verification
  const enrichmentDebug = {
    competitorCount: competitors.length,
    competitorError,
    hasCostEstimate: costEstimate !== null,
    hasMarketSize: marketSize !== null,
    hasThingsNeeded: thingsNeeded !== null,
  };
  console.log(`[generateReportForSession] Enrichment debug:`, enrichmentDebug);
  console.log(
    `[generateReportForSession] Total duration: ${Date.now() - pipelineStartedAt}ms (reason: ${reason})`
  );

  return {
    report,
    updatedAt,
    reportId: upserted?.id,
    enrichmentDebug,
  };
}
