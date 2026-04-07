"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SpiralPreloader from "@/app/components/SpiralPreloader";

function SignupCompleteContent() {
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
        const res = await fetch("/api/signup/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Failed to complete signup");

        if (!cancelled) router.replace("/interviews");
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Something went wrong";
        if (!cancelled) setError(message);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId, router]);

  if (!error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-white">
        <SpiralPreloader className="animate-fade-in" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl border bg-white p-6 text-center">
        <div className="text-xl font-semibold text-black">
          There was a problem finishing signup
        </div>
        <p className="mt-2 text-sm text-red-600">{error}</p>
      </div>
    </div>
  );
}

export default function SignupCompletePage() {
  return (
    <Suspense fallback={<SpiralPreloader className="animate-fade-in" />}>
      <SignupCompleteContent />
    </Suspense>
  );
}
