import OpenAI from "openai";
import { StepKey } from "./signupSteps";
import { ENV } from "./env";

const client = new OpenAI({ apiKey: ENV.OPENAI_API_KEY });

type RewriteResponse = {
    suggestion: string; // the rewritten answer
    reason: string; // short reaosn why this is better
};

export async function aiRewrite(stepKey: StepKey, rawAnswer: string): Promise<RewriteResponse | null > {
    //Only rewrite the steps with strict formats for now (small + safe slice)
    const rewriteable: StepKey[] = ["idea", "problem", "target_customer"];
    if (!rewriteable.includes(stepKey)) return null;

    const system = `
    You are a rewrite assistant for startup signup intake.
        Return ONLY valid JSON (no backticks, no extra text).
        Do not invent facts; preserve meaning.
        Fix spelling/grammar silently.
        If the user did not follow the required structure, rewrite into the required structure.
    `;

    const rulesByStep: Record<string, string> = {
        idea: `Required: "[Startup Name] is a [what it is] that [what it does] by [how it works]."`,
        problem: `Must describe a CUSTOMER PAIN, not a feature. Use "Customers struggle to..."`,
        target_customer:  `Required: "Our target customer is a [age range] [type of person], currently [situation], who cares about [priority], and is looking for [outcome]."`,
    }

    const user = `
    STEP: ${stepKey}
    RULES: ${rulesByStep[stepKey] ?? "Rewrite to be clearer and more specific."}
    USER_ANSWER: ${rawAnswer}
    Return JSON with keys: suggestion, reason
    `;

    const resp = await client.chat.completions.create({
        model: "gpt-5.4-mini",
        temperature: 0.2,
        messages: [
            {role: "system", content: system.trim()},
            {role: "user", content: user.trim()},
        ],
        response_format:{type: "json_object"}
    });

    const content = resp.choices[0]?.message?.content;
    if(!content) return null;

    try {
        const parsed = JSON.parse(content) as RewriteResponse;
        if (!parsed.suggestion) return null;
        return parsed;
    } catch {
        return null;
    }
}