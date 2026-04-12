import { describe, expect, it } from "vitest";
import { toLiveInsightsClusterTitle } from "./liveInsightsTitle";

describe("toLiveInsightsClusterTitle", () => {
  it("returns a 3-word title using meaningful words first", () => {
    expect(
      toLiveInsightsClusterTitle("Users are struggling to manage recurring invoices")
    ).toBe("Users Struggling Manage");
  });

  it("backfills from original tokens when meaningful words are fewer than three", () => {
    expect(toLiveInsightsClusterTitle("The onboarding")).toBe("Onboarding The");
  });

  it("normalizes punctuation and casing", () => {
    expect(
      toLiveInsightsClusterTitle("  THE, checkout-flow!! is -- confusing...  ")
    ).toBe("Checkout-flow Confusing The");
  });

  it("returns fallback for empty input", () => {
    expect(toLiveInsightsClusterTitle("   ")).toBe("Untitled Cluster");
  });

  it("is deterministic for repeated inputs", () => {
    const input = "Teams cannot quickly prioritize interview insights";
    const first = toLiveInsightsClusterTitle(input);
    const second = toLiveInsightsClusterTitle(input);
    expect(first).toBe(second);
  });
});
