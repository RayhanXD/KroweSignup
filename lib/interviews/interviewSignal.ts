export type InterviewSignalLabel = "High" | "Medium" | "Low";

export type InterviewSignalMetrics = {
  avgIntensity: number;
  avgConfidence: number;
  problemCount: number;
};

export type InterviewSignalResult = {
  high_signal: boolean;
  metrics: InterviewSignalMetrics;
};

export type SignalProblemInput = {
  intensity_score: number | null;
  confidence: number | null;
};

const HIGH_INTENSITY_MIN = 4.0;
const HIGH_CONFIDENCE_MIN = 0.7;
const HIGH_PROBLEM_COUNT_MIN = 2;

function safeNumber(value: number | null): number {
  return Number.isFinite(value) ? (value as number) : 0;
}

export function computeInterviewSignal(problems: SignalProblemInput[]): InterviewSignalResult {
  const problemCount = problems.length;
  if (problemCount === 0) {
    return {
      high_signal: false,
      metrics: {
        avgIntensity: 0,
        avgConfidence: 0,
        problemCount: 0,
      },
    };
  }

  const totalIntensity = problems.reduce((sum, p) => sum + safeNumber(p.intensity_score), 0);
  const totalConfidence = problems.reduce((sum, p) => sum + safeNumber(p.confidence), 0);
  const avgIntensity = totalIntensity / problemCount;
  const avgConfidence = totalConfidence / problemCount;

  const high_signal =
    problemCount >= HIGH_PROBLEM_COUNT_MIN &&
    avgIntensity >= HIGH_INTENSITY_MIN &&
    avgConfidence >= HIGH_CONFIDENCE_MIN;

  return {
    high_signal,
    metrics: {
      avgIntensity,
      avgConfidence,
      problemCount,
    },
  };
}

export function deriveInterviewSignalLabel(
  status: "pending" | "structured" | "failed",
  signal: InterviewSignalResult
): InterviewSignalLabel {
  if (status !== "structured") return "Low";
  return signal.high_signal ? "High" : "Medium";
}
