import { StepKey } from "../signupSteps";
import type { Competitor } from "./findCompetitors";
import type { MvpCostEstimate } from "./estimateMvpCost";
import { costEfficiencyEstimate, productTypeScore, startupAdvantageScore } from "./scoring";
import { computeThingsNeed, deriveSkillProfile } from "./thingsNeeded";
import type { MarketSizeLLM } from "./marketsize";
import { REPORT_VERSION } from "../constants";
import { safeNumber } from "../utils/parsing";
import { fmtUSD } from "../utils/formatting";
import type { SignupPayload, ReportData } from "../types/report";
import { getFinal, classifyHours } from "./utils/helpers";
import { estimateTimeToMvp, estimateSkillScore } from "./utils/timeEstimation";
import { buildInputsSection } from "./sections/inputs";
import { buildTimeToMvpSection } from "./sections/timeToMvp";
import { buildFounderFitSection } from "./sections/founderFit";
import { buildSkillsAndIndustrySection } from "./sections/skillsAndIndustry";
import { buildStartupAdvantageSection } from "./sections/startupAdvantage";
import { buildThingsNeededSection } from "./sections/thingsNeeded";
import { buildMvpCostSection } from "./sections/mvpCost";
import { buildCompetitorsSection } from "./sections/competitors";
import { buildMarketSizeSection } from "./sections/marketSize";

// Re-export for backward compatibility
export type { ReportData };

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



//you dont have MVP cost yet -> netural default, add this later 
export function costEfficiencyScore(): { score: number | null; note: string } {
  return { score: null, note: "missing data (we have't added this feature yet" };
}



export function competitorScaffold(industry: string | null): { name: string; link: string; description: string }[] {
  const i = (industry || "").toLowerCase();
  // placeholder scaffold logic
  return [];
}


export function buildMarkdownWithMarketSize(params: {
  existingMarkdown: string;
  marketSize: MarketSizeLLM;
}) {
  const ms = params.marketSize;
  const y1 = ms.planning_year_1;

  const section = [
    ``,
    `## 📊 Market Size (AI Estimate)`,
    `- **Market Definition:** ${ms.market_definition}`,
    `- **TAM:** $${fmtUSD(ms.tam_usd_range.low)}–$${fmtUSD(ms.tam_usd_range.high)} / year`,
    `- **SAM:** $${fmtUSD(ms.sam_usd_range.low)}–$${fmtUSD(ms.sam_usd_range.high)} / year`,
    `- **Wedge SAM:** $${fmtUSD(ms.wedge_sam_usd_range.low)}–$${fmtUSD(ms.wedge_sam_usd_range.high)} / year`,
    `- **Confidence:** ${Math.round(ms.confidence * 100)}%`,
    ``,
    `### 📅 Planning Market Size (Year 1)`,
    `- **Target Revenue:** $${fmtUSD(y1.target_revenue_usd.low)}–$${fmtUSD(y1.target_revenue_usd.high)}`,
    `- **Customer Count:** ${y1.customer_count.low.toLocaleString()}–${y1.customer_count.high.toLocaleString()}`,
    `- **Implied ARPA:** $${fmtUSD(y1.implied_arpa_usd.low)}–$${fmtUSD(y1.implied_arpa_usd.high)}`,
    ``,
    `### Assumptions`,
    ...(ms.key_assumptions?.length ? ms.key_assumptions.map((a) => `- ${a}`) : [`- (none provided)`]),
    ``,
    `### Notes`,
    ...(ms.notes?.length ? ms.notes.map((n) => `- ${n}`) : [`- (none provided)`]),
  ].join("\n");

  return params.existingMarkdown + "\n\n" + section;
}


export function buildReportFromPayload(payload: SignupPayload, opts?: { competitors?: Competitor[]; competitorError?: string; costEstimate?: MvpCostEstimate | null; mvpCostEstimateError?: string; marketSize?: MarketSizeLLM | null }) {
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
  const ageS = ageScore(age)?.score ?? null;
  const costS = costAligmentScore(); //miussing for now
  const costEffS = costEfficiencyScore();
  const ptS = productTypeScore(productType);
  const ind = industryFamiliarityScore(industry);
  const ffs = founderFitScore({ skill: skills.overall, age: ageS, costAligment: costS.score ?? null, industryFamiliarity: ind.score ?? null });


  const flags: string[] = [];
  if (hours != null && hours >= 26) flags.push("Weekly commitment is likely unsustainable (burnour risk is high")
  if (targetCustomer && targetCustomer.toLowerCase().includes("everyone")) flags.push("Target customer is too broad"); //want to fix this in wizard

  const skillScore = estimateSkillScore(skillsRaw);
  const time = estimateTimeToMvp({ productType, skillScore, hours, teamSize });

  const competitors = opts?.competitors ?? [];
  const competitorError = opts?.competitorError;
  const costEstimate = opts?.costEstimate ?? null;
  const marketSize = opts?.marketSize ?? null;

  const profile = deriveSkillProfile(skillsRaw);
  const things = computeThingsNeed({ productType, skillProfile: profile, teamSize });


  //1) scores need for SAS 
  const costEffScore = costEfficiencyEstimate(costEstimate?.cost_mid_usd ?? null);

  //2) Compute SAS score
  const sas = startupAdvantageScore({
    skill: skills.overall ?? null,
    age: ageS ?? null,
    costEff: costEffS.score ?? null,
    productType: ptS.score ?? null,
    industry: ind.score ?? null
  });


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
      costEstimate: opts?.costEstimate ?? undefined,
      startupAdvantage: sas,
      founderFit: ffs,
    },
    flags,
    timeToMvp: time,
    competitors: opts?.competitors ?? [],
    costEstimate,
    competitorError: undefined,
    marketSize,
  }

  // Build markdown sections using modular section builders
  const markdown = [
    `# 🧭 Krowe Pre-Seed Advisor Report`,
    ``,
    buildInputsSection({
      idea,
      productType,
      targetCustomer,
      industry,
      age,
      teamSize,
      hours,
      hoursLabel,
      problem,
      flags,
    }),
    buildTimeToMvpSection({
      label: time.label,
      rationale: time.rationale,
    }),
    `---`,
    buildMarketSizeSection({ marketSize }),
    `*(Next slices will add Founder Fit (FFS), Startup Advantage (SAS), Things Needed, Market Snapshot, Roadmap, and Pivot logic.)*`,
    buildFounderFitSection({
      score: (ffs as any).socre ?? Math.round(((ffs.components.skill * 0.42) + (ffs.components.age * 0.14) + (ffs.components.cost * 0.20) + (ffs.components.industry * 0.24)) * 100),
      category: ffs.category,
      missing: ffs.missing,
      components: ffs.components,
    }),
    buildSkillsAndIndustrySection({
      skills,
      industry: ind,
    }),
    buildStartupAdvantageSection({
      score: sas.score,
      interpretation: sas.interpretation,
      missing: sas.missing,
      components: sas.components,
    }),
    buildThingsNeededSection({
      needs: things.needs,
      gaps: things.gaps,
    }),
    buildMvpCostSection({ costEstimate }),
    buildCompetitorsSection({ competitors }),
  ].join("\n");

  return {
    version: REPORT_VERSION,
    generatedAt: new Date().toISOString(),
    data: {
      inputsSnapshot: {
        idea,
        productType,
        targetCustomer,
        industry,
        age,
        hours,
        teamSize,
        skillsRaw,
        problem,
      },
      //outputs
      flags,
      timeToMvp: time,

      // computed fits
      founderFit: ffs ?? undefined,
      //startup advantage score here
      startupAdvantage: sas ?? undefined,
      //mvp cost estimate
      mvpCostEstimate: costEstimate ?? undefined,
      mvpCostEstimateError: opts?.mvpCostEstimateError,

      //sas score
      startupAdvantageScore: sas,

      //competitors must be acutal array
      competitors,
      //competitors debug string
      competitorError: opts?.competitorError,

      thingsNeed: things,
      marketSize,
    },
    markdown,
  }
}
