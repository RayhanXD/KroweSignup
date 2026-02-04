/**
 * Things You Need Section
 */

type ThingsNeededParams = {
  needs: Array<{ title: string; why: string }>;
};

export function buildThingsNeededSection(params: ThingsNeededParams): string {
  const { needs } = params;

  return [
    `## 🧰 Things You Need`,
    ...needs.map(n => `- **${n.title}** — ${n.why}`),
  ].join("\n");
}
