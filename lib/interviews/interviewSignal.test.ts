import { describe, expect, it } from "vitest";
import { computeInterviewSignal, deriveInterviewSignalLabel } from "./interviewSignal";

describe("computeInterviewSignal", () => {
  it("returns high signal when strict thresholds pass", () => {
    const result = computeInterviewSignal([
      { intensity_score: 4.2, confidence: 0.75 },
      { intensity_score: 4.0, confidence: 0.7 },
    ]);

    expect(result.high_signal).toBe(true);
    expect(result.metrics.problemCount).toBe(2);
  });

  it("returns not high when any strict threshold fails", () => {
    const result = computeInterviewSignal([
      { intensity_score: 4.5, confidence: 0.8 },
    ]);

    expect(result.high_signal).toBe(false);
    expect(result.metrics.problemCount).toBe(1);
  });

  it("returns zero metrics for empty problems", () => {
    const result = computeInterviewSignal([]);

    expect(result.high_signal).toBe(false);
    expect(result.metrics).toEqual({
      avgIntensity: 0,
      avgConfidence: 0,
      problemCount: 0,
    });
  });
});

describe("deriveInterviewSignalLabel", () => {
  it("returns medium for structured interviews without high signal", () => {
    const result = computeInterviewSignal([
      { intensity_score: 3.8, confidence: 0.72 },
      { intensity_score: 3.9, confidence: 0.73 },
    ]);
    expect(deriveInterviewSignalLabel("structured", result)).toBe("Medium");
  });

  it("returns low for non-structured interviews", () => {
    const result = computeInterviewSignal([
      { intensity_score: 5, confidence: 1 },
      { intensity_score: 5, confidence: 1 },
    ]);
    expect(deriveInterviewSignalLabel("pending", result)).toBe("Low");
    expect(deriveInterviewSignalLabel("failed", result)).toBe("Low");
  });
});
