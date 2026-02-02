/**
 * Inputs Snapshot Section
 * 
 * Displays the user's input data in the report.
 */

type InputsParams = {
  idea: string | null;
  productType: string | null;
  targetCustomer: string | null;
  industry: string | null;
  age: number | null;
  teamSize: number | null;
  hours: number | null;
  hoursLabel: string | null;
  problem: string | null;
  flags: string[];
};

export function buildInputsSection(params: InputsParams): string {
  const { idea, productType, targetCustomer, industry, age, teamSize, hours, hoursLabel, problem, flags } = params;

  return [
    `## 📌 Inputs Snapshot`,
    ...(idea != null ? [`- **Startup Idea:** ${idea}`] : []),
    ...(productType != null ? [`- **Product Type:** ${productType}`] : []),
    ...(targetCustomer != null ? [`- **Target Customer:** ${targetCustomer}`] : []),
    ...(industry != null ? [`- **Industry Selected:** ${industry}`] : []),
    ``,
    `### Founder Profile`,
    ...(age != null ? [`- **Age:** ${age}`] : []),
    ...(teamSize != null ? [`- **Team Size:** ${teamSize}`] : []),
    ...(hours != null && hoursLabel != null ? [`- **Weekly Commitment:** ${hours} hrs/week → **${hoursLabel}**`] : []),
    ...(problem != null ? [`- **Problem:** ${problem}`] : []),
    ``,
    `### ⚠ Flags`,
    ...(flags.length ? flags.map((f) => `- ${f}`) : [`- None`]),
    ``,
  ].join("\n");
}
