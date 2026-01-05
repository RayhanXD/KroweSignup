import { join } from "path/win32";
import { StepKey } from "../signupSteps";
import type { Competitor } from "./findCompetitors";

type Payload = Record<string, { final?: string } | any>;

export type ReportData = {
  inputsSnapshot: any;
  flags: string[];
  timeToMvp: any;
  competitors?: Competitor[];
  competitorError?: string;
  competitorDebug?: {
    got?: number;
    error?: string;
    idea?: string | null;
    industry?: string | null;
    targetCustomer?: string | null;
    rawText?: string;
  }
};

function getFinal(payload: any, key: StepKey): string | null {
  const v = payload?.[key]?.final;
  if (typeof v === "string" && v.trim()) return v.trim()
  return null;
}

function safeNumber(v: string | null): number | null {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function classifyHours(hours: number | null): string | null { //find a simpler way to do this later
  if (hours == null) return "⚠ Missing Data";
  if (hours <= 3) return "Very reasonable";
  if (hours <= 7) return "Reasonable";
  if (hours <= 12) return "Normal";
  if (hours <= 18) return "Ambitious";
  if (hours <= 25) return "Difficult";
  if (hours <= 35) return "Borderline unreasonable";
  if (hours <= 50) return "Unreasonable";
  return "Completely unreasonable";
}
function estimateTimeToMvp(params: {
  productType: string | null,
  skillScore: number | null,
  hours: number | null
  teamSize: number | null
}) {
  const { productType, skillScore, hours, teamSize } = params;

  //Base Complexity
  const pt = (productType || "").toLowerCase();
  let baseWeeks = 12;
  if (pt.includes("web")) baseWeeks = 10;
  else if (pt.includes("mobile")) baseWeeks = 14;
  else if (pt.includes("both")) baseWeeks = 18;

  //skill factor: skill= 1 -> faster, skill = 0 -> slower
  const s = skillScore ?? 0.3 //safe fallback for MVP
  const skillFactor = 1.6 - s * 0.8; //skill 1 -> 0.8, skill 0 -> 1.6

  //hours factor
  const h = hours ?? 6;
  const hoursFactor = Math.max(0.6, Math.min(2.0, 20 / Math.max(1, h))); //more hours -> faster, capped between 0.6 and 2.0

  //team factor
  const t = teamSize ?? 1;
  const teamFactor = t > 1 ? 0.85 : 1.0; //small boost for teams

  const weeks = baseWeeks * skillFactor * hoursFactor * teamFactor;

  //range 20% up or down
  const low = Math.max(2, Math.round(weeks * 0.8));
  const high = Math.max(low + 1, Math.round(weeks * 1.2));

  const label =
    high >= 16
      ? `${Math.round(low / 4)}-${Math.round(high / 4)} months`
      : `${low}-${high} weeks`;

  const rationale = `Based on product type (${productType || "unknown"}), estimated skills, ${hours ? `${hours} hrs/week` : "unkown weekly hours"
    }, and team size (${teamSize ?? "unkown"}).`;

  return { lowWeeks: low, highWeeks: high, label, rationale };
}

// Very simple skill score for now (Slice 6.2.2 can refine using your full rubric)
function estimateSkillScore(skillsRaw: string | null): number | null {
  if (!skillsRaw) return null;

  // skills might be JSON string like ["dev","marketing"]
  try {
    const parsed = JSON.parse(skillsRaw);
    if (Array.isArray(parsed)) {
      const set = new Set(parsed.map((s) => String(s).toLowerCase()));
      if (set.has("none")) return 0;
      let total = 0;
      let k = 0;
      if (set.has("dev")) { total += 0.6; k++; }
      if (set.has("marketing")) { total += 0.5; k++; }
      if (set.has("leadership")) { total += 0.4; k++; }
      if (k === 0 && set.has("other")) return 0.2;
      return k ? total / k : 0.2;
    }
  } catch {
    // ignore
  }

  // fallback: if it’s plain text
  return 0.3;
}

//age score
//can tune later 
export function ageScore(age: number | null): { score: number | null; note?: string } {
  if (age == null) return { score: null, note: "missing data" }

  //conservative cureve: early founders still win but less experince than average
  if (age < 16) return { score: 0.35 };
  if (age <= 18) return { score: 0.45 };
  if (age <= 21) return { score: 0.55 };
  if (age <= 24) return { score: 0.65 };
  if (age <= 30) return { score: 0.75 };
  if (age <= 40) return { score: 0.80 };
  return { score: 0.78 };
}

//cost aligment score (0-1)
// you dont currentlyt collect MVP cost so:
//- mark missing
// -use netural default 0.5 so you don't unfairly punish or inflate
//in future make an LLM based estimate based on inputs
export function costAligmentScore(): { score: number | null; note: string } {
  return { score: null, note: "missing data (we have't added this feature yet" };
}

//--industry familiarity score (0-1) from free form question 
//in future use LLM to analyze text and determine the score
export function industryFamiliarityScore(industryExp: string | null): {
  score: number | null;
  level: "High" | "Medium" | "Low" | "Unknown";
  evidence: string[];
} {
  if (!industryExp) return { score: null, level: "Unknown", evidence: ["⚠ Missing Data"] };

  const t = industryExp.toLowerCase();
  const evidence: string[] = [];

  const hasSuccessfulStartup = /(exit|acquir|raised|revenue|profit|grew to|\busers\b)/.test(t);
  const hasWork = /(intern|job|worked|employ|company|role|months|years)/.test(t);
  const hasStudy = /(major|degree|stud(y|ied)|cs|finance|business|certificate|course)/.test(t);
  const hasFailedStartup = /(failed|shut down|didn'?t work|pivoted|couldn'?t)/.test(t);
  const hasPublicWork = /(published|portfolio|github|paper|blog|video)/.test(t);

  if (hasSuccessfulStartup) evidence.push("Mentions traction/revenue/exit-like outcomes");
  if (hasWork) evidence.push("Mentions work/internship experience");
  if (hasStudy) evidence.push("Mentions relevant study/certificates");
  if (hasFailedStartup) evidence.push("Mentions prior attempt (even if failed)");
  if (hasPublicWork) evidence.push("Mentions public work/portfolio");

  // Priority from spec (simplified into tiers) :contentReference[oaicite:5]{index=5}
  if (hasSuccessfulStartup) return { score: 0.90, level: "High", evidence };
  if (hasWork && hasStudy) return { score: 0.70, level: "Medium", evidence };
  if (hasWork) return { score: 0.60, level: "Medium", evidence };
  if (hasStudy || hasFailedStartup || hasPublicWork) return { score: 0.45, level: "Low", evidence };

  return { score: 0.35, level: "Low", evidence: evidence.length ? evidence : ["Generic / unclear experience"] };
}

//update later when skillScore quetsion is more defined and inlcude LLM to anaylze
export function skillScores(skillsRaw: string | null): {
  dev: number | null;
  marketing: number | null;
  leadership: number | null;
  overall: number | null;
  profile: {
    development: "None" | "Beginner" | "Intermediate" | "Advanced" | "Unknown";
    marketing: "None" | "Beginner" | "Intermediate" | "Advanced" | "Unknown";
    leadership: "None" | "Beginner" | "Intermediate" | "Advanced" | "Unknown";
  };
} {
  if (!skillsRaw) {
    return {
      dev: null, marketing: null, leadership: null, overall: null,
      profile: { development: "Unknown", marketing: "Unknown", leadership: "Unknown" }
    };
  }

  // Try JSON array path first
  try {
    const arr = JSON.parse(skillsRaw);
    if (Array.isArray(arr)) {
      const set = new Set(arr.map((s) => String(s).toLowerCase()));
      if (set.has("none")) {
        return {
          dev: 0, marketing: 0, leadership: 0, overall: 0,
          profile: { development: "None", marketing: "None", leadership: "None" }
        };
      }

      const dev = set.has("dev") ? 0.45 : 0;
      const marketing = set.has("marketing") ? 0.40 : 0;
      const leadership = set.has("leadership") ? 0.35 : 0;

      const scores = [dev, marketing, leadership].filter((x) => x > 0);
      const overall = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0.2;

      return {
        dev: dev || null,
        marketing: marketing || null,
        leadership: leadership || null,
        overall,
        profile: {
          development: dev ? "Beginner" : "None",
          marketing: marketing ? "Beginner" : "None",
          leadership: leadership ? "Beginner" : "None",
        },
      };
    }
  } catch {
    // fall through to text heuristic
  }

  // Free text heuristic (very conservative)
  const t = skillsRaw.toLowerCase();
  const hasLang = /(javascript|typescript|python|java|c\+\+|react|next\.js)/.test(t);
  const hasProjects = /(project|built|shipped|deployed|github|portfolio)/.test(t);
  const hasMarketing = /(tiktok|instagram|meta ads|google ads|email|seo|analytics)/.test(t);
  const hasMetrics = /(\b\d+k\b|\b\d+%\b|revenue|leads|conversion)/.test(t);
  const hasLead = /(led|managed|team|president|founder|captain|organized)/.test(t);

  const dev = hasLang && hasProjects ? 0.60 : hasLang ? 0.40 : null;
  const marketing = hasMarketing && hasMetrics ? 0.60 : hasMarketing ? 0.40 : null;
  const leadership = hasLead ? 0.40 : null;

  const scores = [dev, marketing, leadership].filter((x): x is number => typeof x === "number" && x > 0);
  const overall = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

  const level = (x: number | null) =>
    x == null ? "Unknown" : x >= 0.75 ? "Advanced" : x >= 0.55 ? "Intermediate" : x > 0 ? "Beginner" : "None";

  return {
    dev,
    marketing,
    leadership,
    overall,
    profile: {
      development: level(dev),
      marketing: level(marketing),
      leadership: level(leadership),
    },
  };
}

export function founderFitScore(params: {
  skill: number | null;
  age: number | null;
  costAligment: number | null;
  industryFamiliarity: number | null;
}) {
  const missing: string[] = [];
  const skill = params.skill;
  const age = params.age;
  const cost = params.costAligment;
  const ind = params.industryFamiliarity;

  if (skill == null) missing.push("skill score");
  if (age == null) missing.push("age score");
  if (cost == null) missing.push("cost aligment score");
  if (ind == null) missing.push("industry familiarity score");

  //use netural 0.5 defaults only for math contiunuity (and mark missing data)
  const skillEff = skill ?? 0.5;
  const ageEff = age ?? 0.5;
  const costEff = cost ?? 0.5;
  const indEff = ind ?? 0.5;

  //makes skill score
  const score =
    ((skillEff * 0.42) +
      (ageEff * 0.14) +
      (costEff * 0.20) +
      (indEff * 0.24)) *
    100;

  const rounded = Math.round(score)

  const category =
    rounded >= 80 ? "strong fit " : rounded >= 60 ? "partial fit " : "poor fit";

  return {
    socre: rounded,
    category,
    missing,
    components: { skill: skillEff, age: ageEff, cost: costEff, industry: indEff },
  };
}

export function productTypeScore(productType: string | null): { score: number | null; note?: string } {
  if (!productType) return { score: null, note: "missing data" };
  const pt = productType.toLowerCase();

  //Higher score = typically easier/ faster to ship + iterate for mvp
  if (pt.includes("web")) return { score: 0.8 };
  if (pt.includes("mobile")) return { score: 0.6 };
  if (pt.includes("both")) return { score: 0.4 };
  return { score: 0.5, note: "unclear product type" };
}

//you dont have MVP cost yet -> netural default, add this later 
export function costEfficiencyScore(): { score: number | null; note: string } {
  return { score: null, note: "missing data (we have't added this feature yet" };
}

export function startupAdvantageScore(params: {
  skill: number | null;
  age: number | null;
  costEff: number | null;
  productType: number | null;
  industry: number | null;
}) {
  const missing: string[] = [];
  if (params.skill == null) missing.push("skill score");
  if (params.age == null) missing.push("age score");
  if (params.costEff == null) missing.push("cost efficiency score");
  if (params.productType == null) missing.push("product type score");
  if (params.industry == null) missing.push("industry familiarity score");

  //netural defaults for math continuity(data here is still missing)
  const skill = params.skill ?? 0.5;
  const age = params.age ?? 0.5;
  const costEff = params.costEff ?? 0.5;
  const productType = params.productType ?? 0.5;
  const industry = params.industry ?? 0.5;

  const sas0to10 =
    (skill * 0.42 +
      age * 0.13 +
      costEff * 0.15 +
      productType * 0.10 +
      industry * 0.20) * 10;

  //Report expects /100 so store as 0-100
  const sas0to100 = Math.round(sas0to10 * 10);

  const interpreation =
    sas0to100 >= 80 ? "Strong advantage for early execution (still validate demand)." :
      sas0to100 >= 60 ? "Decent position, but you’ll need a sharp niche + consistent execution." :
        sas0to100 >= 40 ? "You can still win, but you’re under-resourced—go narrower and simpler." :
          "High risk vs typical competitors. You need to simplify scope or add missing capabilities.";

  return {
    socre: sas0to100,
    interpreation,
    missing,
    components: { skill, age, costEff, productType, industry },
  }

}

export function competitorScaffold(industry: string | null): { name: string; link: string; description: string }[] {
  const i = (industry || "").toLowerCase();
  // placeholder scaffold logic
  return [];
}

export function buildReportFromPayload(payload: any, opts?: { competitors?: Competitor[]; competitorError?: string }) {
  const age = safeNumber(getFinal(payload, "age"));
  const hours = safeNumber(getFinal(payload, "hours"));
  const teamSize = safeNumber(getFinal(payload, "team_size"));
  const productType = getFinal(payload, "product_type");

  const idea = getFinal(payload, "idea");
  const targetCustomer = getFinal(payload, "target_customer");
  const industry = getFinal(payload, "industry");
  const problem = getFinal(payload, "problem");
  const skillsRaw = getFinal(payload, "skills");

  const hoursLabel = classifyHours(hours);

  const skills = skillScores(skillsRaw);
  const ageS = ageScore(age).score;
  const costS = costAligmentScore(); //miussing for now
  const ind = industryFamiliarityScore(industry);
  const ffs = founderFitScore({ skill: skills.overall, age: ageS, costAligment: costS.score ?? null, industryFamiliarity: ind.score ?? null });

  const flags: string[] = [];
  if (hours != null && hours >= 26) flags.push("Weekly commitment is likely unsustainable (burnour risk is high")
  if (targetCustomer && targetCustomer.toLowerCase().includes("everyone")) flags.push("Target customer is too broad"); //want to fix this in wizard

  const skillScore = estimateSkillScore(skillsRaw);
  const time = estimateTimeToMvp({ productType, skillScore, hours, teamSize });

  const competitors = opts?.competitors ?? [];

  const competitorLines =
    competitors.length
      ? competitors.map((c: any) => `- **${c.name}** — ${c.why_competitor} (${c.url})`).join("\n")
      : `No competitors found yet`;


  const data: ReportData = {
    inputsSnapshot: {
      idea,
      productType,
      targetCustomer,
      industry,
      age,
      hours,
      teamSize,
      skillsRaw,
    },
    flags,
    timeToMvp: time,
    competitors: opts?.competitors ?? [],
    competitorError: undefined,
  }

  const markdown = [
    `# 🧭 Krowe Pre-Seed Advisor Report`,
    ``,
    `## 📌 Inputs Snapshot`,
    `- **Startup Idea:** ${idea ?? "⚠ Missing Data"}`,
    `- **Product Type:** ${productType ?? "⚠ Missing Data"}`,
    `- **Target Customer:** ${targetCustomer ?? "⚠ Missing Data"}`,
    `- **Industry Selected:** ${industry ?? "⚠ Missing Data"}`,
    ``,
    `### Founder Profile`,
    `- **Age:** ${age ?? "⚠ Missing Data"}`,
    `- **Team Size:** ${teamSize ?? "⚠ Missing Data"}`,
    `- **Weekly Commitment:** ${hours ?? "⚠ Missing Data"} hrs/week → **${hoursLabel}**`,
    `- **Problem:** ${problem ?? "⚠ Missing Data"}`,
    ``,
    `### ⚠ Flags`,
    ...(flags.length ? flags.map((f) => `- ${f}`) : [`- None`]),
    ``,
    `## ⏱ Time to MVP`,
    `- **Estimate:** ${time.label}`,
    `- **Rationale:** ${time.rationale}`,
    ``,
    `---`,
    `*(Next slices will add Founder Fit (FFS), Startup Advantage (SAS), Things Needed, Market Snapshot, Roadmap, and Pivot logic.)*`,
    `## 👤 Founder Fit (FFS)`,
    `- **Score:** ${ffs}/100`,
    `- **Category:** ${ffs.category}`,
    ffs.missing?.length ? `- **⚠ Missing Data:** ${ffs.missing.join(", ")}` : `- **Missing Data:** None`,
    ``,
    `### Breakdown`,
    `- **Skill Score:** ${(ffs.components.skill * 100).toFixed(0)}%`,
    `- **Industry Familiarity:** ${(ffs.components.industry * 100).toFixed(0)}%`,
    `- **Age Factor:** ${(ffs.components.age * 100).toFixed(0)}%`,
    `- **Cost Alignment:** ${(ffs.components.cost * 100).toFixed(0)}%`,
    ``,
    `### What this means`,
    `- ${ffs.category === "Strong Fit"
      ? "You have the right foundation to execute quickly and learn fast."
      : ffs.category === "Partial Fit"
        ? "You can absolutely proceed, but execution will require tighter focus and support in weaker areas."
        : "This idea may still work, but your current profile suggests high execution risk without major changes."}`,
    ``,
    `### Recommendation`,
    `- ${ffs.category === "Strong Fit"
      ? "Proceed with a tight MVP scope and start user interviews immediately."
      : ffs.category === "Partial Fit"
        ? "Narrow the MVP scope and fill 1 key gap (skill or industry experience) before building too much."
        : "Consider pivoting to a simpler version of the idea or adding a cofounder/mentor to cover gaps before building."}`,
    `## 🧠 Skills & Industry Experience`,
    ``,
    `### Skill Profile`,
    `- **Development:** ${skills.profile.development}`,
    `- **Marketing:** ${skills.profile.marketing}`,
    `- **Leadership:** ${skills.profile.leadership}`,
    `- **Overall Skill Score:** ${skills.overall == null ? "⚠ Missing Data" : `${Math.round(skills.overall * 100)}%`}`,
    ``,
    `### Industry Familiarity`,
    `- **Level:** ${ind.level}`,
    `- **Score:** ${ind.score == null ? "⚠ Missing Data" : `${Math.round(ind.score * 100)}%`}`,
    ``,
    `### Evidence`,
    ...(ind.evidence.map(e => `- ${e}`)),

    "## 🥊 Top Competitors",
    competitorLines,
    "",
  ].join("\n");

  return {
    version: "6.2.2",
    generatedAt: new Date().toISOString(),
    data,
    markdown,
  }
}
