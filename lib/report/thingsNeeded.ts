type SkillProfile = {
    hasDev: boolean;
    hasMarketing: boolean;
    hasLeadership: boolean;
};

export  function deriveSkillProfile(skillsRaw: string | null): SkillProfile {
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