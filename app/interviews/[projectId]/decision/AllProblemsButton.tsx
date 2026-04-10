"use client";

import { useState } from "react";
import type { ProblemCluster } from "@/lib/interviews/types";

type ClusterWithId = ProblemCluster & { id: string };

export function AllProblemsButton({ allClusters }: { allClusters: ClusterWithId[] }) {
  const [open, setOpen] = useState(false);

  const categoryOrder: string[] = [];
  const byCategory = new Map<string, ClusterWithId[]>();
  for (const cluster of allClusters) {
    const cat = cluster.category ?? "General Problems";
    if (!byCategory.has(cat)) {
      byCategory.set(cat, []);
      categoryOrder.push(cat);
    }
    byCategory.get(cat)!.push(cluster);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        View All Problems →
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative bg-card border border-border rounded-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <h2 className="text-sm font-semibold">All Problem Clusters</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors text-lg leading-none"
              >
                ✕
              </button>
            </div>

            {/* Scrollable content */}
            <div className="overflow-y-auto px-6 py-4 space-y-6">
              {categoryOrder.map((cat) => {
                const clusters = byCategory.get(cat)!;
                return (
                  <div key={cat}>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 pb-1 border-b border-border">
                      {cat}
                    </h3>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-muted-foreground">
                          <th className="pb-2 pr-4 font-medium">Problem</th>
                          <th className="pb-2 pr-4 font-medium text-right">Freq</th>
                          <th className="pb-2 pr-4 font-medium text-right">Intensity</th>
                          <th className="pb-2 font-medium text-right">Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clusters.map((cluster) => (
                          <tr key={cluster.id} className="border-t border-border/50">
                            <td className="py-2.5 pr-4 font-medium">{cluster.canonical_problem}</td>
                            <td className="py-2.5 pr-4 text-right text-muted-foreground tabular-nums">{cluster.frequency}</td>
                            <td className="py-2.5 pr-4 text-right text-muted-foreground tabular-nums">
                              {cluster.avg_intensity.toFixed(1)}
                            </td>
                            <td className="py-2.5 text-right font-medium tabular-nums">{cluster.score.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
