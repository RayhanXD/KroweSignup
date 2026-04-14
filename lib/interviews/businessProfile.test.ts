import { describe, expect, it } from "vitest";
import {
  emptyBusinessProfile,
  prefillBusinessProfileFromSignup,
  validateBusinessProfileCompletion,
} from "@/lib/interviews/businessProfile";

describe("businessProfile completion", () => {
  it("requires core fields and one constraint", () => {
    const profile = emptyBusinessProfile();
    const result = validateBusinessProfileCompletion(profile);

    expect(result.ok).toBe(false);
    expect(result.missingFields).toContain("problemHypothesis.coreProblemStatement");
    expect(result.missingFields).toContain("customerMarketFocus.primaryCustomerSegment");
    expect(result.missingFields).toContain("successCriteria.decisionObjective");
    expect(result.missingFields).toContain("constraints");
  });

  it("passes when required core fields are present", () => {
    const profile = emptyBusinessProfile();
    profile.problemHypothesis.coreProblemStatement = "Users waste hours summarizing interviews.";
    profile.customerMarketFocus.primaryCustomerSegment = "Early-stage founders";
    profile.successCriteria.decisionObjective = "Pick next feature scope";
    profile.constraints.timelineConstraints = "Need decision within 2 weeks";

    const result = validateBusinessProfileCompletion(profile);
    expect(result.ok).toBe(true);
    expect(result.missingFields).toEqual([]);
  });
});

describe("businessProfile prefill", () => {
  it("maps signup answers into profile sections", () => {
    const profile = prefillBusinessProfileFromSignup([
      { step_key: "idea", final_answer: "AI interview synthesis" },
      { step_key: "problem", final_answer: "Manual synthesis is too slow" },
      { step_key: "target_customer", final_answer: "Founders" },
      { step_key: "features", final_answer: '["Transcription", "Clustering"]' },
      { step_key: "competitors", final_answer: '["Dovetail"]' },
      { step_key: "alternatives", final_answer: '["Notion"]' },
      { step_key: "industry", final_answer: '{"industry":"saas","other":""}' },
      { step_key: "startup_stage", final_answer: "validation" },
    ]);

    expect(profile.companySnapshot.valueProposition).toBe("AI interview synthesis");
    expect(profile.problemHypothesis.coreProblemStatement).toBe("Manual synthesis is too slow");
    expect(profile.customerMarketFocus.primaryCustomerSegment).toBe("Founders");
    expect(profile.problemHypothesis.assumptionsBeingTested).toEqual([
      "Transcription",
      "Clustering",
    ]);
    expect(profile.competitiveContext.directCompetitors).toEqual(["Dovetail"]);
    expect(profile.competitiveContext.alternativesToday).toEqual(["Notion"]);
  });
});
