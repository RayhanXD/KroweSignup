"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Status = "idle" | "loading" | "success" | "error";

interface RefreshReportButtonProps {
  sessionId: string;
}

/**
 * DEV-ONLY button to refresh/regenerate a report.
 * Calls POST /api/signup/report/refresh and then triggers router.refresh()
 * to re-fetch the server component data.
 */
export function RefreshReportButton({ sessionId }: RefreshReportButtonProps) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string>("");

  // Only render in development
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  async function handleRefresh() {
    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/signup/report/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || `Request failed with status ${res.status}`);
      }

      setStatus("success");
      setMessage("Report refreshed! Reloading...");

      // Trigger Next.js router refresh to re-fetch server component data
      router.refresh();

      // Clear success message after a moment
      setTimeout(() => {
        setStatus("idle");
        setMessage("");
      }, 2000);
    } catch (err: unknown) {
      setStatus("error");
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setMessage(errorMessage);

      // Clear error after a few seconds
      setTimeout(() => {
        setStatus("idle");
        setMessage("");
      }, 5000);
    }
  }

  return (
    <div className="inline-flex items-center gap-3">
      <button
        onClick={handleRefresh}
        disabled={status === "loading"}
        className={`
          px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors
          ${status === "loading"
            ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
            : "bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100"
          }
        `}
      >
        {status === "loading" ? "Refreshing..." : "🔄 Refresh Report (Test)"}
      </button>

      {message && (
        <span
          className={`text-xs ${
            status === "success" ? "text-green-600" : "text-red-600"
          }`}
        >
          {message}
        </span>
      )}
    </div>
  );
}
