import OpenAI from "openai";
import { ENV } from "../env";

const client = new OpenAI({ apiKey: ENV.OPENAI_API_KEY });

export type Competitor = {
    name: string;
    url: string;
    why_competitor: string;
    evidence: string; //short qoute like paraphase of what they do 
};

export async function findCompetitorsViaWeb(params: {
    idea: string;
    industry: string;
    targetCustomer?: string | null;
}) {
    const { idea, industry, targetCustomer } = params;

    const prompt = `
    Find 3 direct competitors for this startup idea.
    
    Idea: ${idea}
    Industry: ${industry}
    Target Customer: ${targetCustomer || "unknown"} 

    You are a competitive landscape analyst for early-stage startups.

Definition rules (must be enforced strictly):
- Direct competitors MUST solve the same core job-to-be-done
- They MUST target a similar customer profile
- They MUST be ONLINE, SOFTWARE-BASED solutions

Misinterpretation prevention (CRITICAL):
Before listing any competitor, apply this filter:
- If the startup is an online product, platform, or SaaS → ONLY return online software/platform competitors
- EXCLUDE:
  - Agencies, consultants, freelancers
  - Offline programs, incubators, accelerators, bootcamps
  - Communities, Discords, newsletters, content-only sites
  - Generic tools unless they are purpose-built for the same core job
If a company primarily delivers value through people or services, it is NOT a valid competitor.

Geographic preference:
- Prefer US-based companies when possible
- Use global companies ONLY if no strong US-based direct competitor exists

Evidence rules:
- Do NOT invent companies
- Use web search
- Each competitor MUST have:
  - A real company name
  - A valid homepage URL
  - A short, factual explanation of why it is a direct competitor

Tone:
- Neutral and analytical
- Do not exaggerate competition or dismiss the idea

Output rules:
- Return ONLY valid JSON
- Always return EXACTLY 3 competitors
- Do not include commentary outside the JSON

    Format:
    {
        "competitors": [
            {"name": "...", "url": "...", "why_competitor": "...", "evidence": "..."}
        ]
    }
    `;

    const resp = await client.responses.create({
        model: "gpt-5-nano",
        tools: [{ type: "web_search" }], //enables web search tool
        input: prompt,
        include: ["web_search_call.action.sources"]         //for full sources list
    });

    console.log("OPENAI output_text:", resp.output_text);
    console.log("OPENAI raw output items: ", JSON.stringify(resp.output, null, 2))

    const text = resp.output_text;

    let parsed: any;
    try {
        parsed = JSON.parse(resp.output_text?.trim() ?? "");
    } catch (e) {
        console.error("failed to parse competitors json:", resp.output_text);
        console.log("OPENAI raw output items:", JSON.stringify(resp.output, null, 2));
        throw e;
    }

    return {
        competitors: parsed.competitors as Competitor[],
        //Optional: store sources too for audit/debug (from include)
        sources: (resp as any)?.sources ?? null,
    };
}