import OpenAI from "openai";
import { ENV } from "../env";

const openai = new OpenAI({
    apiKey: ENV.OPENAI_API_KEY,
});

export type ThingsNeededResult = {
    needs: Array<{ title: string; why: string }>;
};

function extractResponseText(response: any): string {
    if (typeof response?.output_text === "string" && response.output_text.trim()) {
        return response.output_text.trim();
    }
    const out = response?.output;
    if (Array.isArray(out)) {
        for (const item of out) {
            const content = item?.content;
            if (Array.isArray(content)) {
                for (const c of content) {
                    const t = c?.text;
                    if (typeof t === "string" && t.trim()) return t.trim();
                }
            }
        }
    }
    return "";
}

function isValidThingsNeeded(x: any): x is ThingsNeededResult {
    return (
        Array.isArray(x?.needs) &&
        x.needs.every((n: any) => typeof n?.title === "string" && typeof n?.why === "string")
    );
}

export async function computeThingsNeededLLM(params: {
    idea: string | null;
    productType: string | null;
    targetCustomer: string | null;
    industry: string | null;
    problem: string | null;
    skillsRaw: string | null;
    teamSize: number | null;
    hours: number | null;
}): Promise<ThingsNeededResult | null> {
    const payload = {
        idea: params.idea ?? "not provided",
        productType: params.productType ?? "not provided",
        targetCustomer: params.targetCustomer ?? "not provided",
        industry: params.industry ?? "not provided",
        problem: params.problem ?? "not provided",
        skills: params.skillsRaw ?? "not provided",
        teamSize: params.teamSize ?? 1,
        hoursPerWeek: params.hours ?? "not provided",
    };

    try {
        const response = await openai.responses.create({
            model: "gpt-5.4-mini",
            input: [
                {
                    role: "system",
                    content:
                        "You are a startup advisor helping early-stage/pre-seed founders understand what they need to build their startup.\n\n" +
                        "Your job:\n" +
                        "Generate 4-8 actionable items the founder NEEDS to create their startup (things like tech stack, legal, marketing assets, etc.)\n\n" +
                        "Rules:\n" +
                        "- Be specific to their idea, industry, and product type\n" +
                        "- Prioritize the most critical needs first\n" +
                        "- Keep titles concise (3-6 words)\n" +
                        "- Keep 'why' explanations to 1 sentence\n\n" +
                        "Return ONLY valid JSON matching the schema (no markdown, no commentary outside JSON).",
                },
                {
                    role: "user",
                    content:
                        "Based on this founder's signup inputs, generate a list of things they NEED to build their startup:\n\n" +
                        "Inputs:\n" +
                        JSON.stringify(payload, null, 2),
                },
            ],
            text: {
                format: {
                    type: "json_schema",
                    name: "things_needed",
                    strict: true,
                    schema: {
                        type: "object",
                        additionalProperties: false,
                        required: ["needs"],
                        properties: {
                            needs: {
                                type: "array",
                                items: {
                                    type: "object",
                                    additionalProperties: false,
                                    required: ["title", "why"],
                                    properties: {
                                        title: { type: "string" },
                                        why: { type: "string" },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        const raw = extractResponseText(response);
        console.log("THINGS_NEEDED_RAW:", raw);

        if (!raw) {
            console.warn("things needed: empty model output, full response:", response);
            return null;
        }

        const parsed = JSON.parse(raw);

        if (!isValidThingsNeeded(parsed)) {
            console.warn("Things needed: schema mismatch. Raw:", raw);
            return null;
        }

        return parsed;
    } catch (e) {
        console.error("Failed to compute things needed via LLM:", e);
        return null;
    }
}

//add AI aspect later for better results
export function computeThingsNeed(params: {
    productType: string | null;
}) {
    const pt = (params.productType || "".toLowerCase())
    const isWeb = pt.includes("web");
    const isMobile = pt.includes("mobile");
    const isBoth = pt.includes("both");

    const needs: {title: string; why: string} [] = [];

    //always needed items 
    needs.push(
    { title: "Value proposition + positioning", why: "Clarifies why users should care and how you're different." },
    { title: "MVP scope (non-negotiables only)", why: "Prevents overbuilding and keeps time-to-MVP realistic." },
    { title: "Analytics + feedback loop", why: "You need usage data and user feedback to iterate quickly." },
    { title: "Landing page + waitlist (or onboarding)", why: "Start capturing demand while building." }
  );

    //product type needs
    if (isWeb || isBoth) needs.push({ title: "Web app stack (auth, DB, hosting)", why: "Core infrastructure to ship and iterate." });
    if (isMobile || isBoth) needs.push({ title: "Mobile build plan (iOS/Android)", why: "Mobile has more friction (testing, store review, releases)." });

    return {needs};
}
