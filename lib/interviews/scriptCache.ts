import type { InterviewScript } from "./generateScript";

export function normalizeOptionalText(value: unknown): string | null {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

export function hasStoredInterviewScript(value: unknown): boolean {
  return value !== null && value !== undefined;
}

export function shouldUseStoredInterviewScript(
  interviewScript: unknown,
  regenerate: boolean
): boolean {
  return hasStoredInterviewScript(interviewScript) && !regenerate;
}

export function didInterviewerFieldsChange(args: {
  currentName: unknown;
  currentContext: unknown;
  nextName: unknown;
  nextContext: unknown;
}): boolean {
  const currentName = normalizeOptionalText(args.currentName);
  const currentContext = normalizeOptionalText(args.currentContext);
  const nextName = normalizeOptionalText(args.nextName);
  const nextContext = normalizeOptionalText(args.nextContext);
  return currentName !== nextName || currentContext !== nextContext;
}

export function summarizeInterviewScriptForDebug(script: unknown): {
  hasInterviewScript: boolean;
  sectionCount: number | null;
  questionCount: number | null;
} {
  if (!hasStoredInterviewScript(script)) {
    return {
      hasInterviewScript: false,
      sectionCount: null,
      questionCount: null,
    };
  }

  const maybeScript = script as Partial<InterviewScript>;
  const sections = Array.isArray(maybeScript.sections) ? maybeScript.sections : [];
  const questionCount = sections.reduce((acc, section) => {
    const questions = Array.isArray(section?.questions) ? section.questions : [];
    return acc + questions.length;
  }, 0);

  return {
    hasInterviewScript: true,
    sectionCount: sections.length,
    questionCount,
  };
}
