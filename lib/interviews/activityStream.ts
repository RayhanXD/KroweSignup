export type ActivityEntry = {
  ts: string;
  tag: "qte" | "clu" | "pat";
  text: string;
};

type Interview = {
  id: string;
  created_at: string;
  interviewee_name: string | null;
};

type Cluster = {
  id: string;
  canonical_problem: string;
  updated_at?: string;
  frequency?: number;
};

type Decision = {
  updated_at: string;
  confidence_score: number | null;
} | null;

function fmtTs(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "--:--";
  }
}

export function buildActivityStream({
  interviews,
  clusters,
  decision,
}: {
  interviews: Interview[];
  clusters: Cluster[];
  decision: Decision;
}): ActivityEntry[] {
  const entries: Array<ActivityEntry & { _sort: number }> = [];

  for (const iv of interviews) {
    const name = iv.interviewee_name?.trim() || "unknown interviewee";
    entries.push({
      ts: fmtTs(iv.created_at),
      tag: "qte",
      text: `New interview captured from <b>${name}</b>.`,
      _sort: new Date(iv.created_at).getTime(),
    });
  }

  for (const c of clusters) {
    if (!c.updated_at) continue;
    const title = c.canonical_problem.length > 40
      ? c.canonical_problem.slice(0, 37) + "…"
      : c.canonical_problem;
    entries.push({
      ts: fmtTs(c.updated_at),
      tag: "clu",
      text: `Cluster <b>${title}</b> strengthened (${c.frequency ?? 1} interview${(c.frequency ?? 1) !== 1 ? "s" : ""}).`,
      _sort: new Date(c.updated_at).getTime(),
    });
  }

  if (decision?.confidence_score != null) {
    const pct = Math.round(decision.confidence_score * 100);
    entries.push({
      ts: fmtTs(decision.updated_at),
      tag: "clu",
      text: `Confidence reached <b>${pct}%</b>.`,
      _sort: new Date(decision.updated_at).getTime(),
    });
  }

  return entries
    .sort((a, b) => b._sort - a._sort)
    .slice(0, 6)
    .map(({ _sort: _s, ...e }) => e);
}
