"use client";

import { useEffect, useMemo, useState } from "react";

const RADIUS = 110;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const LOADING_PROGRESS_CAP = 99;
const EASING_TIME_CONSTANT_MS = 12000;

function getStepForProgress(progress: number) {
  if (progress >= 90) return 4;
  if (progress >= 60) return 3;
  if (progress >= 30) return 2;
  return 1;
}

function getPhaseLabel(progress: number) {
  const step = getStepForProgress(progress);
  switch (step) {
    case 1:
      return "Analyzing";
    case 2:
      return "Assessing";
    case 3:
      return "Evaluating";
    case 4:
      return "Finalizing";
    default:
      return "Analyzing";
  }
}

export interface ProgressScreenProps {
  /**
   * Reserved for future use if you want
   * to explicitly snap to 100% from a parent.
   */
  isDone?: boolean;
}

export function ProgressScreen({ isDone }: ProgressScreenProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame: number | null = null;
    let start: number | null = null;
    let cancelled = false;

    // If the parent marks the work as done, immediately snap to 100%
    if (isDone) {
      setProgress((prev) => (prev < 100 ? 100 : prev));
      return () => {
        cancelled = true;
        if (frame != null) {
          window.cancelAnimationFrame(frame);
        }
      };
    }

    const animate = (timestamp: number) => {
      if (cancelled) return;
      if (start == null) start = timestamp;
      const elapsed = timestamp - start;

      const easingRatio = 1 - Math.exp(-elapsed / EASING_TIME_CONSTANT_MS);
      const rawNext = easingRatio * LOADING_PROGRESS_CAP;
      const next = Math.min(LOADING_PROGRESS_CAP, rawNext);

      setProgress((prev) => {
        const clampedNext = Math.min(LOADING_PROGRESS_CAP, next);
        return Math.max(prev, clampedNext);
      });

      frame = window.requestAnimationFrame(animate);
    };

    frame = window.requestAnimationFrame(animate);

    return () => {
      cancelled = true;
      if (frame != null) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [isDone]);

  const phaseLabel = useMemo(() => getPhaseLabel(progress), [progress]);
  const activeStep = useMemo(() => getStepForProgress(progress), [progress]);
  const displayProgress = useMemo(
    () => Math.min(100, Math.max(0, Math.round(progress))),
    [progress]
  );
  const strokeDashoffset = useMemo(
    () => CIRCUMFERENCE * (1 - displayProgress / 100),
    [displayProgress]
  );

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-6 md:py-8 max-w-4xl mx-auto w-full">
      {/* Main Loading State */}
      <div
        className="w-full flex flex-col items-center text-center space-y-8"
        role="status"
        aria-label="Generating startup intelligence"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={displayProgress}
      >
        {/* Progress Section */}
        <div className="relative flex items-center justify-center">
          {/* Progress Ring */}
          <svg className="size-48 md:size-64 lg:size-72" viewBox="0 0 320 320">
            <circle
              className="text-slate-200 stroke-current"
              cx="160"
              cy="160"
              fill="transparent"
              r={RADIUS}
              strokeWidth={8}
            />
            <circle
              className="text-orange-500 stroke-current progress-ring-circle transition-all duration-300 ease-out"
              cx="160"
              cy="160"
              fill="transparent"
              r={RADIUS}
              strokeLinecap="round"
              strokeWidth={12}
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={strokeDashoffset}
              transform = "rotate(270 160 160)"
            />
          </svg>

          {/* Percentage Center */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900">
              {displayProgress}%
            </span>
            <span className="text-xs md:text-sm font-semibold text-orange-500 uppercase tracking-[0.2em] mt-1">
              {phaseLabel}
            </span>
          </div>
        </div>

        <div className="space-y-1">
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">
            Generating Startup Intelligence
          </h1>
          <p className="text-slate-500 max-w-md mx-auto text-sm md:text-base">
            Our AI is processing millions of data points to evaluate your
            venture&apos;s market readiness and financial viability.
          </p>
        </div>

        {/* Status Timeline */}
        <div className="w-full max-w-lg mt-4 md:mt-6 bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex flex-col space-y-0">
            {/* Step 1 */}
            <div className="flex gap-4 group">
              <div className="flex flex-col items-center">
                <div className="size-6 rounded-full bg-green-500 text-white flex items-center justify-center z-10">
                  <span className="material-symbols-outlined text-sm font-bold">
                    check
                  </span>
                </div>
                <div className="w-0.5 bg-green-500 h-10 -my-1" />
              </div>
              <div className="flex flex-col items-start pb-4">
                <p className="text-slate-900 font-semibold text-base leading-tight">
                  Step 1: Analyzing Market Size
                </p>
                <p className="text-green-600 text-sm font-medium">
                  Completed • TAM/SAM/SOM defined
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4 group">
              <div className="flex flex-col items-center">
                <div
                  className={[
                    "size-6 rounded-full flex items-center justify-center z-10",
                    activeStep === 2
                      ? "border-2 border-orange-500 bg-white animate-pulse"
                      : activeStep > 2
                      ? "bg-green-500 text-white"
                      : "border-2 border-slate-200 bg-white",
                  ].join(" ")}
                >
                  {activeStep > 2 ? (
                    <span className="material-symbols-outlined text-sm font-bold">
                      check
                    </span>
                  ) : activeStep === 2 ? (
                    <div className="size-2 rounded-full bg-orange-500" />
                  ) : null}
                </div>
                <div
                  className={[
                    "w-0.5 h-10 -my-1",
                    activeStep > 2
                      ? "bg-green-500"
                      : "bg-slate-200",
                  ].join(" ")}
                />
              </div>
              <div className="flex flex-col items-start pb-4">
                <p className="text-slate-900 font-semibold text-base leading-tight">
                  Step 2: Assessing MVP Cost
                </p>
                <p
                  className={[
                    "text-sm font-medium",
                    activeStep > 2
                      ? "text-green-600"
                      : activeStep === 2
                      ? "text-orange-500"
                      : "text-slate-400",
                  ].join(" ")}
                >
                  {activeStep > 2
                    ? "Completed • Burn rate models calibrated"
                    : "Processing • Calculating burn rate models"}
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4 group">
              <div className="flex flex-col items-center">
                <div
                  className={[
                    "size-6 rounded-full flex items-center justify-center z-10",
                    activeStep >= 3
                      ? activeStep > 3
                        ? "bg-green-500 text-white"
                        : "border-2 border-orange-500 bg-white animate-pulse"
                      : "border-2 border-slate-200 bg-white",
                  ].join(" ")}
                >
                  {activeStep > 3 ? (
                    <span className="material-symbols-outlined text-sm font-bold">
                      check
                    </span>
                  ) : null}
                </div>
                <div
                  className={[
                    "w-0.5 h-10 -my-1",
                    activeStep > 3
                      ? "bg-green-500"
                      : "bg-slate-200",
                  ].join(" ")}
                />
              </div>
              <div className="flex flex-col items-start pb-4">
                <p
                  className={[
                    "font-medium text-base leading-tight",
                    activeStep >= 3
                      ? "text-slate-900"
                      : "text-slate-400",
                  ].join(" ")}
                >
                  Step 3: Evaluating Competitors
                </p>
                <p
                  className={[
                    "text-sm",
                    activeStep > 3
                      ? "text-green-600"
                      : activeStep === 3
                      ? "text-orange-500"
                      : "text-slate-400",
                  ].join(" ")}
                >
                  {activeStep > 3
                    ? "Completed • Competitive landscape mapped"
                    : activeStep === 3
                    ? "Processing • Competitive landscape scan"
                    : "Pending • Competitive landscape scan"}
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-4 group">
            <div className="flex flex-col items-center">
              <div
                className={[
                  "size-6 rounded-full flex items-center justify-center z-10",
                  isDone && activeStep >= 4
                    ? "bg-green-500 text-white"
                    : activeStep >= 4
                    ? "border-2 border-orange-500 bg-white animate-pulse"
                    : "border-2 border-slate-200 bg-white",
                ].join(" ")}
              >
                {isDone && activeStep >= 4 ? (
                  <span className="material-symbols-outlined text-sm font-bold">
                    check
                  </span>
                ) : activeStep >= 4 ? (
                  <div className="size-2 rounded-full bg-orange-500" />
                ) : null}
              </div>
            </div>
              <div className="flex flex-col items-start">
                <p
                  className={[
                    "font-medium text-base leading-tight",
                    activeStep >= 4
                      ? "text-slate-900"
                      : "text-slate-400",
                  ].join(" ")}
                >
                  Step 4: Finalizing Report
                </p>
                <p
                  className={[
                    "text-sm",
                    isDone && activeStep >= 4
                      ? "text-green-600"
                      : activeStep >= 4
                      ? "text-orange-500"
                      : "text-slate-400",
                  ].join(" ")}
                >
                  {isDone && activeStep >= 4
                    ? "Completed • Institutional grade PDF generation"
                    : activeStep >= 4
                    ? "Finalizing • Generating institutional-grade PDF"
                    : "Pending • Institutional grade PDF generation"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="pt-4 md:pt-6 flex items-center gap-2 text-slate-400 text-[10px] md:text-xs">
          <span className="material-symbols-outlined text-lg">verified_user</span>
          <p className="text-xs font-medium uppercase tracking-widest">
            End-to-End Encryption Enabled
          </p>
        </div>
      </div>
    </main>
  );
}

