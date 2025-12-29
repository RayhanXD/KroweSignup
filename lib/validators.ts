import { StepKey } from "@/lib/signupSteps";

export type ValidationIssue = {
  code: string;
  message: string;
  severity?: "error" | "warning";
};

export type ValidationResult = {
  status: "ok" | "needs_fix";
  issues: ValidationIssue[];
};

// silent “cleanup” (don’t mention to user you did it) :contentReference[oaicite:5]{index=5}
export function normalizeAnswer(input: string): string {
  return (input ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function needsFix(code: string, message: string): ValidationResult {
  return { status: "needs_fix", issues: [{ code, message, severity: "error" }] };
}

export function validateStep(stepKey: StepKey, raw: string): ValidationResult {
  const v = normalizeAnswer(raw);

  // basic required
  if (!v) return needsFix("REQUIRED", "Please enter an answer before continuing.");

  switch (stepKey) {
    case "age": {
      const n = Number(v);
      if (!Number.isFinite(n)) return needsFix("NUMBER", "Age must be a number (in years).");
      if (n < 10 || n > 100) return needsFix("RANGE", "Please enter a realistic age (10–100).");
      return { status: "ok", issues: [] };
    }

    case "hours": {
      const n = Number(v);
      if (!Number.isFinite(n)) return needsFix("NUMBER", "Hours must be a number.");
      if (n < 1 || n > 80) return needsFix("RANGE", "Enter weekly hours between 1 and 80.");
      // Spec says warn for unrealistic, but allow continue :contentReference[oaicite:6]{index=6}
      if (n >= 26) {
        return {
          status: "ok",
          issues: [
            {
              code: "BURNOUT_RISK",
              message: "This weekly commitment may be hard to sustain. Burnout risk is high.",
              severity: "warning",
            },
          ],
        };
      }
      return { status: "ok", issues: [] };
    }

    case "idea": {
      // Must contain “is a”, “that”, “by” in that order-ish :contentReference[oaicite:7]{index=7}
      const lower = v.toLowerCase();
      const hasIsA = lower.includes(" is a ");
      const hasThat = lower.includes(" that ");
      const hasBy = lower.includes(" by ");
      if (!hasIsA || !hasThat || !hasBy) {
        return needsFix(
          "FORMAT",
          'Use this structure: “[Startup Name] is a [what it is] that [what it does] by [how it works].”'
        );
      }
      if (v.length < 30) return needsFix("TOO_SHORT", "Make it more specific (at least ~1 sentence).");
      return { status: "ok", issues: [] };
    }

    case "problem": {
      // Heuristic: if it reads like a solution, ask to rephrase as a problem :contentReference[oaicite:8]{index=8}
      const lower = v.toLowerCase();
      const looksLikeSolution =
        (lower.includes("we help") || lower.includes("we provide") || lower.includes("we build")) &&
        !lower.includes("struggle") &&
        !lower.includes("pain") &&
        !lower.includes("difficult");
      if (looksLikeSolution) {
        return needsFix(
          "PROBLEM_NOT_SOLUTION",
          'Rephrase as the customer pain: “Customers struggle to…” / “It’s hard for customers to…”'
        );
      }
      if (v.length < 15) return needsFix("TOO_SHORT", "Describe the pain more clearly (1–2 sentences).");
      return { status: "ok", issues: [] };
    }

    case "target_customer": {
      // Must include key phrases from your required format :contentReference[oaicite:9]{index=9}
      const lower = v.toLowerCase();
      const required = ["our target customer is", "currently", "cares about", "looking for"];
      const missing = required.filter((p) => !lower.includes(p));
      if (missing.length) {
        return needsFix(
          "FORMAT",
          "Use the target customer structure (include: age range, type of person, currently…, cares about…, looking for…)."
        );
      }
      if (lower.includes("everyone")) return needsFix("TOO_BROAD", '“Everyone” is too broad. Niche down.');
      return { status: "ok", issues: [] };
    }

    case "product_type": {
      const lower = v.toLowerCase();
      const ok =
        lower.includes("web") || lower.includes("mobile") || lower.includes("both") || lower.includes("other");
      if (!ok) return needsFix("CHOICE", "Answer should be: web, mobile, both, or other.");
      return { status: "ok", issues: [] };
    }

    case "team_size": {
      const n = Number(v);
      if (!Number.isFinite(n)) return needsFix("NUMBER", "Team size must be a number.");
      if (n < 1 || n > 30) return needsFix("RANGE", "Enter team size between 1 and 30 unles its truly over 30.");
      return { status: "ok", issues: [] };
    }

    // For now: light validation (we’ll tighten later)
    case "industry":
    case "industry_experience":
    case "skills":
    default:
      return { status: "ok", issues: [] };
  }
}
