"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function GranolaImportsButton() {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);

  async function handleClick() {
    setSyncing(true);
    try {
      await fetch("/api/integrations/granola/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullResync: false }),
      });
    } catch {
      // proceed to imports even on error
    } finally {
      setSyncing(false);
      router.push("/interviews/imports");
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={syncing}
      className="px-3 py-1.5 rounded-full border border-border/80 text-xs font-semibold text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
    >
      {syncing ? "Syncing..." : "Granola Imports"}
    </button>
  );
}
