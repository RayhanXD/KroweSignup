import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

    Rules: 
    -Direct Competitors = solve the same core job to be done for similar customers.
    -Return only JSON with keys: competitors(array of 3 objects)
    -Each competitor must include a valid homepage URL.
    -Do NOT invent companies. Use web search and only return competitors you can support with evidence.

    Format:
    {
        "competitors": [
            {"name": "...", "url": "...", "why_competitor": "...", "evidence": "..."}
        ]
    }
    `;

    const resp = await client.responses.create({
        model: "gpt-5",
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