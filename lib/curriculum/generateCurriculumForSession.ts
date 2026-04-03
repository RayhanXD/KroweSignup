import OpenAI from "openai";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { ENV } from "@/lib/env";
import { buildInputsFromAnswers } from "@/lib/report/buildInputsFromAnswers";
import { CURRICULUM_JSON_VERSION } from "./constants";
import { parseCurriculumPayload } from "./schema";
import type { CurriculumPayloadV1 } from "./schema";
import { inferTargetStageIndex } from "./inferTargetStageIndex";
import {
  buildCurriculumSystemPrompt,
  buildCurriculumUserPrompt,
} from "./buildCurriculumPrompt";
import {
  formatFrameworkForPrompt,
  selectDeepAndShallowCategories,
} from "./filterTaskFramework";

const client = new OpenAI({ apiKey: ENV.OPENAI_API_KEY });

/** Model for structured curriculum JSON; override via env in future if needed */
const CURRICULUM_MODEL = "gpt-5.4-mini";

export type GenerateCurriculumOptions = {
  reason?: "generate" | "refresh";
};

export type GenerateCurriculumResult = {
  updatedAt: string;
  curriculumId?: string;
};

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

type StagesOnly = { stages: CurriculumPayloadV1["stages"] };

function parseStagesJson(content: string): StagesOnly {
  const trimmed = content.trim();
  const parsed = JSON.parse(trimmed) as unknown;
  if (typeof parsed !== "object" || parsed === null || !("stages" in parsed)) {
    throw new Error("Response JSON must contain a top-level 'stages' array");
  }
  const stages = (parsed as { stages: unknown }).stages;
  if (!Array.isArray(stages)) {
    throw new Error("stages must be an array");
  }
  return { stages: stages as CurriculumPayloadV1["stages"] };
}

async function callOpenAIForStages(
  system: string,
  user: string,
  isRetry: boolean
): Promise<string> {
  const systemContent =
    isRetry
      ? `${system}\n\nYour previous output was invalid. Return ONLY valid JSON with a top-level "stages" array (6 objects, stageIndex 1..6). Each task must include "category" from the closed set. No markdown.`
      : system;

  const resp = await client.chat.completions.create({
    model: CURRICULUM_MODEL,
    temperature: 0.35,
    max_tokens: 16000,
    messages: [
      { role: "system", content: systemContent },
      { role: "user", content: user },
    ],
    response_format: { type: "json_object" },
  });

  const content = resp.choices[0]?.message?.content;
  if (!content) throw new Error("Empty OpenAI response");
  return content;
}

export async function generateCurriculumForSession(
  sessionId: string,
  opts: GenerateCurriculumOptions = {}
): Promise<GenerateCurriculumResult> {
  const { reason = "generate" } = opts;
  const supabase = createServerSupabaseClient();
  const startedAt = Date.now();

  console.log(`[generateCurriculumForSession] Starting (reason=${reason}) sessionId=${sessionId}`);

  const { data: answers, error: answersError } = await supabase
    .from("signup_answers")
    .select("step_key, final_answer")
    .eq("session_id", sessionId);

  if (answersError) {
    throw new Error(`Failed to load signup answers: ${answersError.message}`);
  }

  if (!answers || answers.length === 0) {
    throw new Error("No answers found for session");
  }

  const inputs = buildInputsFromAnswers(answers);
  const targetStageIndex = inferTargetStageIndex(inputs);

  const { deep, shallow } = selectDeepAndShallowCategories(inputs, targetStageIndex);
  const filteredFrameworkBlock = formatFrameworkForPrompt(deep, shallow);
  const system = buildCurriculumSystemPrompt({ filteredFrameworkBlock });
  const user = buildCurriculumUserPrompt({ inputs, targetStageIndex });

  let stagesOnly: StagesOnly;
  try {
    const content = await callOpenAIForStages(system, user, false);
    stagesOnly = parseStagesJson(content);
  } catch (first: unknown) {
    console.warn(
      `[generateCurriculumForSession] First attempt failed; retrying (${errorMessage(first, "parse")})`
    );
    const content = await callOpenAIForStages(system, user, true);
    stagesOnly = parseStagesJson(content);
  }

  const generatedAt = new Date().toISOString();
  const payload: CurriculumPayloadV1 = {
    curriculumVersion: CURRICULUM_JSON_VERSION,
    sessionId,
    targetStageIndex,
    generatedAt,
    stages: stagesOnly.stages,
  };

  const validated = parseCurriculumPayload(payload);
  if (!validated.success) {
    throw new Error(
      `Curriculum validation failed: ${validated.error.message}`
    );
  }

  const updatedAt = new Date().toISOString();

  const { data: upserted, error: upsertError } = await supabase
    .from("signup_curricula")
    .upsert(
      {
        session_id: sessionId,
        status: "ready",
        curriculum_version: CURRICULUM_JSON_VERSION,
        payload: validated.data as unknown as Record<string, unknown>,
        error: null,
        updated_at: updatedAt,
      },
      { onConflict: "session_id" }
    )
    .select("id")
    .single();

  if (upsertError) {
    throw new Error(`Failed to save curriculum: ${upsertError.message}`);
  }

  console.log(
    `[generateCurriculumForSession] Done in ${Date.now() - startedAt}ms, curriculumId=${upserted?.id}`
  );

  return {
    updatedAt,
    curriculumId: upserted?.id,
  };
}
