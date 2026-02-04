type SignupAnswer = {
    step_key: string;
    final_answer: string | null;
};

type IndustryAnswer = {
    industry?: string | null;
    other?: string | null;
};

function normalizeIndustryAnswer(value: string | null): string | null {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return value;

    try {
        const parsed = JSON.parse(trimmed) as IndustryAnswer;
        if (parsed?.industry === "other" && parsed.other?.trim()) {
            return parsed.other.trim();
        }
        if (typeof parsed?.industry === "string" && parsed.industry.trim()) {
            return parsed.industry.trim();
        }
    } catch {
        return value;
    }

    return value;
}

export function buildInputsFromAnswers(
    answers: SignupAnswer[]
) {
    const inputs: Record<string, string | null> = {};

    for (const answer of answers) {
        if (answer.step_key === "industry") {
            inputs[answer.step_key] = normalizeIndustryAnswer(answer.final_answer ?? null);
            continue;
        }
        inputs[answer.step_key] = answer.final_answer ?? null;
    }

    return inputs;
}