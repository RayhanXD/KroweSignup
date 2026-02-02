import OpenAI from "openai";
import { ENV } from "../env";

const openai = new OpenAI({
    apiKey: ENV.OPENAI_API_KEY,
});

export type ThingsNeededResult = {
    needs: Array<{ title: string; why: string }>;
    gaps: Array<{ gap: string; impact: string; fixes: string[] }>;
};

type SkillProfile = {
    hasDev: boolean;
    hasMarketing: boolean;
    hasLeadership: boolean;
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
        x.needs.every((n: any) => typeof n?.title === "string" && typeof n?.why === "string") &&
        Array.isArray(x?.gaps) &&
        x.gaps.every((g: any) =>
            typeof g?.gap === "string" &&
            typeof g?.impact === "string" &&
            Array.isArray(g?.fixes) &&
            g.fixes.every((f: any) => typeof f === "string")
        )
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
            model: "gpt-4o-mini",
            input: [
                {
                    role: "system",
                    content:
                        "You are a startup advisor helping early-stage/pre-seed founders understand what they need to build their startup.\n\n" +
                        "Your job:\n" +
                        "1. Generate 4-8 actionable items the founder NEEDS to create their startup (things like tech stack, legal, marketing assets, etc.)\n" +
                        "2. Identify 0-4 skill/resource GAPS based on their profile and provide specific fixes for each\n\n" +
                        "Rules:\n" +
                        "- Be specific to their idea, industry, and product type\n" +
                        "- Prioritize the most critical needs first\n" +
                        "- For gaps, only include genuine gaps based on their skills/team - don't invent problems\n" +
                        "- Keep titles concise (3-6 words)\n" +
                        "- Keep 'why' explanations to 1 sentence\n" +
                        "- Provide 2-4 practical fixes per gap\n" +
                        "- Consider their weekly hours and team size when assessing gaps\n\n" +
                        "Return ONLY valid JSON matching the schema (no markdown, no commentary outside JSON).",
                },
                {
                    role: "user",
                    content:
                        "Based on this founder's signup inputs, generate:\n" +
                        "1. A list of things they NEED to build their startup\n" +
                        "2. Any skill/resource GAPS they should address\n\n" +
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
                        required: ["needs", "gaps"],
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
                            gaps: {
                                type: "array",
                                items: {
                                    type: "object",
                                    additionalProperties: false,
                                    required: ["gap", "impact", "fixes"],
                                    properties: {
                                        gap: { type: "string" },
                                        impact: { type: "string" },
                                        fixes: {
                                            type: "array",
                                            items: { type: "string" },
                                        },
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

export function deriveSkillProfile(skillsRaw: string | null): SkillProfile {
    if(!skillsRaw) return {hasDev: false, hasMarketing: false, hasLeadership: false};

    try {
        const arr = JSON.parse(skillsRaw);
        if (Array.isArray(arr)) {
            const s = new Set(arr.map((x) => String(x).toLowerCase()));
            if (s.has("none")) return {hasDev: false, hasMarketing: false, hasLeadership: false};

        return {
            hasDev: s.has("dev"),
            hasMarketing: s.has("marketing"),
            hasLeadership: s.has("leadership"),
        };
    }
        } catch {
            //fall through
        }

    const t = skillsRaw.toLowerCase();
    return {
        hasDev:  /(dev|code|react|next|typescript|python|build)/.test(t),
        hasMarketing: /(marketing|seo|ads|tiktok|instagram|growth)/.test(t),
        hasLeadership: /(lead|manage|team|founder)/.test(t),
    };
}

//add AI aspect later for better results
export function computeThingsNeed(params: {
    productType: string | null;
    skillProfile: SkillProfile;
    teamSize: number | null;
}) {
    const pt = (params.productType || "".toLowerCase())
    const isWeb = pt.includes("web");
    const isMobile = pt.includes("mobile");
    const isBoth = pt.includes("both");

    const needs: {title: string; why: string} [] = [];
    const gaps: {gap: string; impact: string; fixes: string[] }[]= [];

    //always needed items 
    needs.push(
    { title: "Value proposition + positioning", why: "Clarifies why users should care and how you’re different." },
    { title: "MVP scope (non-negotiables only)", why: "Prevents overbuilding and keeps time-to-MVP realistic." },
    { title: "Analytics + feedback loop", why: "You need usage data and user feedback to iterate quickly." },
    { title: "Landing page + waitlist (or onboarding)", why: "Start capturing demand while building." }
  );

    //product type needs
    if (isWeb || isBoth) needs.push({ title: "Web app stack (auth, DB, hosting)", why: "Core infrastructure to ship and iterate." });
    if (isMobile || isBoth) needs.push({ title: "Mobile build plan (iOS/Android)", why: "Mobile has more friction (testing, store review, releases)." });

    //skill gaps
    const { hasDev, hasMarketing, hasLeadership} = params.skillProfile

    if (!hasDev) {
        gaps.push({
            gap: "dev capability",
            impact: "You’ll move slower building MVP + fixing bugs without a builder.",
            fixes: [
                "Pair with a technical cofounder",
                "Hire a freelancer for the first MVP",
                "Build with a no-code / low-code MVP to validate first",
            ],
        })
    }

     if (!hasMarketing) {
    gaps.push({
      gap: "Distribution / marketing capability",
      impact: "Even a great MVP struggles without a channel to reach users.",
      fixes: [
        "Pick 1 channel and commit (content, cold outreach, communities, paid ads)",
        "Recruit a growth/marketing partner",
        "Run 10 user interviews + capture language for positioning",
      ],
    });
  }

   if (!hasLeadership && (params.teamSize ?? 1) > 1) {
    gaps.push({
      gap: "Leadership / coordination",
      impact: "Teams stall without clear ownership and weekly execution rhythm.",
      fixes: [
        "Define roles + weekly deliverables",
        "Use a single task board and 1 weekly review",
        "Set a release cadence (weekly/biweekly)",
      ],
    });
  }

    return {needs, gaps};
}