"use client";
import { useState } from "react";
import type { MetaCluster, ProblemCluster } from "@/lib/interviews/types";

type ClusterWithId = ProblemCluster & { id: string };

export function MetaClusterCard({
  mc,
  allClusters,
}: {
  mc: MetaCluster;
  allClusters: ClusterWithId[];
}) {
  const [open, setOpen] = useState(false);
  const relatedClusters = allClusters.filter((c) => mc.cluster_ids.includes(c.id));
  const clustersToShow = relatedClusters.length > 0 ? relatedClusters : allClusters;
  const isStaleData = relatedClusters.length === 0 && allClusters.length > 0;

  return (
    <>
      <div className="border border-border rounded-lg p-4 flex flex-col gap-2">
        <p className="font-semibold text-sm leading-snug">{mc.title}</p>
        <p className="text-sm text-muted-foreground leading-relaxed">{mc.description}</p>
        <div className="flex items-center gap-2 mt-auto pt-2">
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            {mc.frequency} mentions
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-foreground text-background">
            Score: {mc.score.toFixed(2)}
          </span>
          {allClusters.length > 0 && (
            <button
              onClick={() => setOpen(true)}
              className="ml-auto text-xs px-2 py-0.5 rounded border border-border hover:bg-muted transition-colors"
            >
              View All
            </button>
          )}
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-card border border-border rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-base">{mc.title}</h2>
              {isStaleData && (
                <span className="text-xs text-muted-foreground">(rerun analysis to filter by theme)</span>
              )}
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground text-lg leading-none"
              >
                ✕
              </button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border">
                  <th className="pb-2 pr-4 font-medium">Problem</th>
                  <th className="pb-2 pr-4 font-medium text-right">Freq</th>
                  <th className="pb-2 pr-4 font-medium text-right">Intensity</th>
                  <th className="pb-2 font-medium text-right">Score</th>
                </tr>
              </thead>
              <tbody>
                {clustersToShow.map((c) => (
                  <tr key={c.id} className="border-t border-border/50">
                    <td className="py-2.5 pr-4 font-medium">{c.canonical_problem}</td>
                    <td className="py-2.5 pr-4 text-right text-muted-foreground">{c.frequency}</td>
                    <td className="py-2.5 pr-4 text-right text-muted-foreground">{c.avg_intensity.toFixed(1)}</td>
                    <td className="py-2.5 text-right font-medium">{c.score.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
