import { NextResponse } from "next/server";
import { generateReportForSession } from "@/lib/report/generateReportForSession";

/**
 * POST /api/signup/report/refresh
 *
 * Dev-only endpoint for testing prompt changes.
 * Regenerates a report from stored signup_answers, including all LLM enrichment
 * (competitors, MVP cost, market size).
 *
 * This allows you to:
 * 1. Edit prompts in lib/report/*.ts
 * 2. Call this endpoint to regenerate with updated prompts
 * 3. See the new results without going through the full signup flow
 */
export async function POST(req: Request) {
  // Dev-only guard
  if (process.env.NODE_ENV === "production") {
    return new NextResponse(null, { status: 404 });
  }

  let body;
  try {
    body = await req.json();
  } catch (err: any) {
    console.error("[refresh] Error parsing request body:", err);
    return NextResponse.json(
      { error: "Invalid JSON" },
      { status: 400 }
    );
  }

  const { sessionId } = body;

  if (!sessionId || typeof sessionId !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid sessionId" },
      { status: 400 }
    );
  }

  console.log("[refresh] Regenerating report for session:", sessionId);

  try {
    // Use the shared pipeline - runs all LLM enrichment modules
    const result = await generateReportForSession(sessionId, {
      reason: "refresh",
      forceRegenerate: true,
    });

    // Log enrichment results for debugging prompt changes
    if (result.enrichmentDebug) {
      console.log("[refresh] Enrichment results:", {
        competitors: result.enrichmentDebug.competitorCount,
        competitorError: result.enrichmentDebug.competitorError,
        hasCostEstimate: result.enrichmentDebug.hasCostEstimate,
        hasMarketSize: result.enrichmentDebug.hasMarketSize,
      });
    }

    return NextResponse.json({
      ok: true,
      sessionId,
      updatedAt: result.updatedAt,
      reportId: result.reportId,
      // Include enrichment debug info in dev response
      enrichmentDebug: result.enrichmentDebug,
    });
  } catch (error: any) {
    console.error("[refresh] Report generation failed:", error);
    return NextResponse.json(
      { error: error?.message || "Report refresh failed" },
      { status: 500 }
    );
  }
}
