"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function SignupCompletePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setError("Missing sessionId. Please restart signup.");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/signup/report/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Failed to generate report");

        if (!cancelled) router.replace(`/report/${sessionId}`);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Something went wrong");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId, router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl border bg-white p-6 text-center">
        <div className="text-xl font-semibold text-black">
          Generating your Krowe roadmap…
        </div>

        {!error ? (
          <p className="mt-2 text-sm text-gray-600">
            This usually takes a moment.
          </p>
        ) : (
          <p className="mt-2 text-sm text-red-600">{error}</p>
        )}
      </div>
    </div>
  );
}
