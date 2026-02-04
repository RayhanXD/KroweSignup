/**
 * Skills & Industry Experience Section
 */

type SkillsAndIndustryParams = {
  skills: {
    profile: {
      development: string;
      marketing: string;
      leadership: string;
    };
    overall: number | null;
  };
  industry: {
    level: string;
    score: number | null;
    evidence: string[];
  };
};

export function buildSkillsAndIndustrySection(params: SkillsAndIndustryParams): string {
  const { skills, industry } = params;

  return [
    `## 🧠 Skills & Industry Experience`,
    ``,
    `### Skill Profile`,
    `- **Development:** ${skills.profile.development}`,
    `- **Marketing:** ${skills.profile.marketing}`,
    `- **Leadership:** ${skills.profile.leadership}`,
    ...(skills.overall != null ? [`- **Overall Skill Score:** ${Math.round(skills.overall * 100)}%`] : []),
    ``,
    `### Industry Familiarity`,
    `- **Level:** ${industry.level}`,
    ...(industry.score != null ? [`- **Score:** ${Math.round(industry.score * 100)}%`] : []),
    ``,
  ].join("\n");
}
