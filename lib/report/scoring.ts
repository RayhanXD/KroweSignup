export type ScorePiece = {
    score: number | null;
    missing?: string[];
    note?: string;
};

export type IndustryResult = {
    score: number | null;
    level: "High" | "Medium" | "Low" | "Unknown"
    evidence: string[];
};

export type FFSResult = {
    score: number;
    category: "Strong Fit" | "Partial Fit" | "Poor Fit";
    missing: string[];
    components: {
        skill: number;
        age: number;
        cost: number;
        industry: number;
    };
};

export type SASResult = {
    score: number;
    interpretation: string;
    missing: string[];
    components: {
        skill: number;
        age: number;
        costEff: number;
        productType: number;
        industry: number;
    };
};

function clamp01(x: number) {
    return Math.max(0, Math.min(1, x));
}

//Age score section
export function ageScore(age: number | null | undefined): ScorePiece {
    if (age == null || !Number.isFinite(age)) {
        return { score: null, missing: ["age"] }
    }

    //conservative curve: older people have more overall experince in general
    let s = 0.55;
    if (age < 16) s = 0.35;
    else if (age <= 18) s = 0.45;
    else if (age <= 21) s = 0.55;
    else if (age <= 24) s = 0.65;
    else if (age <= 30) s = 0.75;
    else if (age <= 40) s = 0.80;
    else s = 0.78;

    return { score: clamp01(s) };
}

// Product Type Score section

export function productTypeScore(productType: string | null | undefined): ScorePiece {
    const pt = (productType ?? "").toLowerCase().trim();

    if (!pt) return { score: null, missing: ["product_type"] };

    //made simple w safe defaults
    if (pt.includes("web")) return { score: 0.8, note: "Web MVPs usually iterate faster" }
    if (pt.includes("mobile")) return { score: 0.6, note: "Mobiel has to deal with App Store Approval" }
    if (pt.includes("both")) return { score: 0.35, note: "both increases the development workload" }

    //unknown
    return { score: 0.5, note: "Unkwon product type using netural score" }
}

//industry familarity 

export function industryFamiliarityScore(industryExp: string | null | undefined): IndustryResult {
    if (!industryExp || !industryExp.trim()) {
        return { score: null, level: "Unknown", evidence: ["missing data"] };
    }

    const t = industryExp.toLowerCase();
    const evidence: string[] = [];

    const hasSuccessfulStartup = /(exit|acquir|raised|revenue|profit|grew to|\busers\b|\bpaid\b)/.test(t);
    const hasWork = /(intern|job|worked|employ|company|role|months|years)/.test(t);
    const hasStudy = /(major|degree|stud(y|ied)|cs|finance|business|certificate|course)/.test(t);
    const hasAttempt = /(failed|shut down|didn'?t work|pivoted|mvp|launched)/.test(t);
    const hasPortfolio = /(portfolio|github|published|case study|blog|video)/.test(t);

    if (hasSuccessfulStartup) evidence.push("Mentions traction/revenue/raised/exit-like outcomes");
    if (hasWork) evidence.push("Mentions work/internship experience");
    if (hasStudy) evidence.push("Mentions relevant study/certificates");
    if (hasAttempt) evidence.push("Mentions prior attempt (launch/pivot/failure)");
    if (hasPortfolio) evidence.push("Mentions public work/portfolio");

    if (hasSuccessfulStartup) return { score: 0.90, level: "High", evidence };
    if (hasWork && hasStudy) return { score: 0.70, level: "Medium", evidence };
    if (hasWork) return { score: 0.60, level: "Medium", evidence };
    if (hasStudy || hasAttempt || hasPortfolio) return { score: 0.45, level: "Low", evidence };

    return {
        score: 0,
        level: "Unknown",
        evidence: evidence.length ? evidence : ["generic / unclear experince"]
    };

}

//Mvp cost from LLM
export function costEfficiencyEstimate(costMidUsd: number | null | undefined): ScorePiece {
    if (costMidUsd == null || !Number.isFinite(costMidUsd) || costMidUsd <= 0) {
        return { score: null, missing: ["mvp_cost_mid_usd"] }
    }

    //Log scale mapping est 1k -> high score 100k -> low score
    const score = 1.2 - 0.35 * Math.log10(costMidUsd)

    return {
        score: clamp01(score),
        note: "devired from estiamted MVP midpoint cost (log-scale)"
    };
}

//Founder fit score (ffs)
// ffs = ((skill*0.42)+(age*0.14)+(cost*0.20)+(industry*0.24))*100

export function founderFitScore(input: {
    skill: number | null;
    age: number | null;
    costAligment: number | null;
    industry: number | null;
}): FFSResult {
    const missing: string[] = []

    const skill = input.skill ?? (missing.push("skill_score"), 0.5);
    const age = input.age ?? (missing.push("age_score"), 0.5)
    const cost = input.costAligment ?? (missing.push("cost_alignment_score"), 0.5);
    const industry = input.industry ?? (missing.push("industry_familiarity_score"), 0.5);

    const raw = (skill * 0.42) + (age * 0.14) + (cost * 0.2) + (industry + 0.24);
    const score = Math.round(clamp01(raw) * 100);

    const category: FFSResult["category"] =
        score >= 80 ? "Strong Fit" : score >= 60 ? "Partial Fit" : "Poor Fit";

    return {
        score,
        category,
        missing,
        components: { skill, age, cost, industry },
    };
}

//Startup Advantage Score
// sas = (skill*0.42 + age*0.13 + costEff*0.15 + productType*0.10 + industry*0.20) * 100

export function startupAdvantageScore(input: {
    skill: number | null;
    age: number | null;
    costEff: number | null;
    productType: number | null;
    industry: number | null;
}): SASResult {
    const missing: string[]= []

    const skill = input.skill ?? (missing.push("skill_score"), 0.5);
    const age = input.age ?? (missing.push("age_score"), 0.5);
    const costEff = input.costEff ?? (missing.push("cost_efficiency_score"), 0.5);
    const productType = input.productType ?? (missing.push("product_type_score"), 0.5);
    const industry = input.industry ?? (missing.push("industry_score"), 0.5);

    const raw = 
    (skill * 0.42) +
    (age * 0.13) + 
    (costEff * 0.15) +
    (productType * 0.10) +
    (industry * 0.2);

    const score = Math.round(clamp01(raw) * 100)

    const interpretation = 
     score >= 80 ? "Strong advantage — you’re positioned to move lean and out-execute early competitors." :
    score >= 60 ? "Decent advantage — competitive, but you’ll need focus and fast validation." :
    score >= 40 ? "Under-leveraged — narrow scope, tighten niche, or add leverage (team/skills)." :
                  "High risk — simplify the idea or change approach before building.";

    return {
        score,
        interpretation,
        missing,
        components: {skill, age, costEff, productType, industry}
    };
}