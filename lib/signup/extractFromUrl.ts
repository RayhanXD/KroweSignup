import OpenAI from "openai";
import { ENV } from "@/lib/env";
import { extractResponseText } from "@/lib/openai/extractResponseText";
import type { ExtractedUrlOnboardingModelOutput } from "@/lib/signup/urlOnboarding";

const client = new OpenAI({ apiKey: ENV.OPENAI_API_KEY });

export async function extractOnboardingFromUrlContent(
  content: string,
  sourceUrl: string
): Promise<ExtractedUrlOnboardingModelOutput> {
  const systemPrompt =
    "You extract startup onboarding fields from website content. " +
    "Infer missing details reasonably from context. " +
    "Never return null values, always return valid JSON matching the schema.";

  const userPrompt = [
    `Source URL: ${sourceUrl}`,
    "Extract the following fields exactly:",
    "idea, product_type, features, problem, target_customer, industry, competitors, alternatives, pricing_models, startup_stage.",
    "",
    "Rules:",
    "- idea: one sentence in form '[Name] is a [desc] that solves [problem] by [mechanism]'.",
    "- product_type: one of mobile|web|both|other.",
    "- features: 3-8 concrete capabilities.",
    "- problem: core customer problem (not solution pitch).",
    "- target_customer: who this is for and what they want.",
    "- industry: concise text label.",
    "- competitors: known alternatives/competitors list, empty array allowed.",
    "- alternatives: current workaround behaviors, empty array allowed.",
    "- pricing_models: array of subscription|one-time|freemium|usage-based.",
    "- startup_stage: one of idea|validation|pre-mvp|mvp|early-traction|growth.",
    "",
    "Website content:",
    content,
  ].join("\n");

  const response = await client.responses.create({
    model: "gpt-5.4-mini",
    input: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "url_onboarding_extract",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            idea: { type: "string" },
            product_type: { type: "string", enum: ["mobile", "web", "both", "other"] },
            features: {
              type: "array",
              items: { type: "string" },
            },
            problem: { type: "string" },
            target_customer: { type: "string" },
            industry: { type: "string" },
            competitors: {
              type: "array",
              items: { type: "string" },
            },
            alternatives: {
              type: "array",
              items: { type: "string" },
            },
            pricing_models: {
              type: "array",
              items: {
                type: "string",
                enum: ["subscription", "one-time", "freemium", "usage-based"],
              },
            },
            startup_stage: {
              type: "string",
              enum: ["idea", "validation", "pre-mvp", "mvp", "early-traction", "growth"],
            },
          },
          required: [
            "idea",
            "product_type",
            "features",
            "problem",
            "target_customer",
            "industry",
            "competitors",
            "alternatives",
            "pricing_models",
            "startup_stage",
          ],
        },
      },
    },
  });

  const raw = extractResponseText(response);
  if (!raw) {
    throw new Error("URL extraction returned empty model output");
  }

  return JSON.parse(raw) as ExtractedUrlOnboardingModelOutput;
}
