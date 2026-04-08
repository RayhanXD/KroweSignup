import { describe, expect, it } from "vitest";
import {
  didInterviewerFieldsChange,
  normalizeOptionalText,
  shouldUseStoredInterviewScript,
  summarizeInterviewScriptForDebug,
} from "./scriptCache";

describe("scriptCache helpers", () => {
  it("normalizes optional text fields", () => {
    expect(normalizeOptionalText("  Alex  ")).toBe("Alex");
    expect(normalizeOptionalText("   ")).toBeNull();
    expect(normalizeOptionalText(null)).toBeNull();
  });

  it("uses cached script only when present and not regenerating", () => {
    const cached = { intro: "Hi", sections: [], closing: "Thanks" };
    expect(shouldUseStoredInterviewScript(cached, false)).toBe(true);
    expect(shouldUseStoredInterviewScript(cached, true)).toBe(false);
    expect(shouldUseStoredInterviewScript(null, false)).toBe(false);
  });

  it("detects interviewer field changes with normalization", () => {
    expect(
      didInterviewerFieldsChange({
        currentName: "Alex",
        currentContext: "Founder",
        nextName: " Alex ",
        nextContext: "Founder",
      })
    ).toBe(false);

    expect(
      didInterviewerFieldsChange({
        currentName: "Alex",
        currentContext: "Founder",
        nextName: "Taylor",
        nextContext: "Founder",
      })
    ).toBe(true);
  });

  it("summarizes script debug metadata safely", () => {
    const withScript = summarizeInterviewScriptForDebug({
      intro: "Hi",
      sections: [
        { title: "One", questions: [{ question: "Q1", probes: [] }] },
        { title: "Two", questions: [{ question: "Q2", probes: [] }] },
      ],
      closing: "Bye",
    });
    expect(withScript).toEqual({
      hasInterviewScript: true,
      sectionCount: 2,
      questionCount: 2,
    });

    const withoutScript = summarizeInterviewScriptForDebug(null);
    expect(withoutScript).toEqual({
      hasInterviewScript: false,
      sectionCount: null,
      questionCount: null,
    });
  });
});
