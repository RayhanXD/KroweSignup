export type StepKey = 
| "age"
| "idea"
| "product_type"
| "problem"
| "target_customer"
| "industry"
| "industry_experience"
| "skills"
| "team_size"
| "hours";

export const SIGNUP_STEPS: StepKey [] = [
    "age",
    "idea",
    "product_type",
    "problem",
    "target_customer",
    "industry",
    "industry_experience",
    "skills",
    "team_size",
    "hours",
];

export function isValidStepKey(v: string): v is StepKey {
    return (SIGNUP_STEPS as string[]).includes(v);
}

export function getFirstStepKey(): StepKey {
    return SIGNUP_STEPS[0];
}

export function getNextStepKey(current: StepKey): StepKey | null {
    const idx = SIGNUP_STEPS.indexOf(current);
    if (idx === -1) return null;
    return SIGNUP_STEPS[idx +1] ?? null;
}

export function getPrevStepKey (current: StepKey): StepKey | null {
    const idx = SIGNUP_STEPS.indexOf(current);
    if (idx <= 0) return null;
    return SIGNUP_STEPS[idx - 1 ]?? null;
}

export function getProgressPercent(current: StepKey): number {
    const idx = SIGNUP_STEPS.indexOf(current);
    if (idx === -1) return 0;
    return Math.round(((idx + 1) / SIGNUP_STEPS.length) * 100);
}