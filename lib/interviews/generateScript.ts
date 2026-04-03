import OpenAI from "openai";
import { ENV } from "../env";

const client = new OpenAI({ apiKey: ENV.OPENAI_API_KEY });

export type InterviewScript = {
  intro: string;
  sections: Array<{
    title: string;
    questions: Array<{
      question: string;
      probes: string[];
    }>;
  }>;
  closing: string;
};

type OnboardingData = {
  idea: string;
  problem: string;
  target_customer: string;
  features: string[];
};

type InterviewerInfo = {
  name: string | null;
  context: string | null;
};

const GENERIC_SCRIPT: InterviewScript = {
  intro:
    "Hi, thanks so much for taking the time to chat with me. I'm doing some research to better understand how people deal with [the problem area]. I'm not here to pitch anything — I just want to learn from your experience. There are no right or wrong answers, and feel free to tell me if something doesn't apply to you.",
  sections: [
    {
      title: "Current Workflow",
      questions: [
        {
          question: "Walk me through how you currently handle this area day-to-day.",
          probes: [
            "What tools or processes do you rely on most?",
            "How long have you been doing it this way?",
            "Who else is involved in this process?",
          ],
        },
        {
          question: "What does a typical week look like for you around this?",
          probes: [
            "How much time does this take you?",
            "Is it consistent or does it vary a lot?",
          ],
        },
      ],
    },
    {
      title: "Pain Points",
      questions: [
        {
          question: "What's the most frustrating part of how things work today?",
          probes: [
            "Can you walk me through a recent time when this went wrong?",
            "How did that make you feel?",
            "What was the downstream impact?",
          ],
        },
        {
          question: "What do you wish you could just make disappear from your workflow?",
          probes: [
            "Why does that bother you so much?",
            "How often does this happen?",
          ],
        },
      ],
    },
    {
      title: "Solutions Tried",
      questions: [
        {
          question: "Have you tried to solve this before? What did you try?",
          probes: [
            "Why didn't that work out?",
            "What did you like about it before it fell short?",
            "Did you try anything else after that?",
          ],
        },
        {
          question: "What would need to be true for a solution to actually stick?",
          probes: [
            "What's the deal-breaker for you with existing tools?",
            "What would you need to see before you'd pay for something?",
          ],
        },
      ],
    },
    {
      title: "Ideal Outcome",
      questions: [
        {
          question: "If this problem was completely solved, what would that look like?",
          probes: [
            "How would your day be different?",
            "What would you be able to do that you can't do now?",
            "How would you measure success?",
          ],
        },
        {
          question: "What would a perfect solution feel like to use?",
          probes: [
            "What's non-negotiable for you?",
            "What does 'simple' look like in this context for you?",
          ],
        },
      ],
    },
  ],
  closing:
    "That's really helpful — thank you. Before I let you go, is there anything else you think I should know about this problem? Also, would it be okay if I follow up with you as I learn more? I'd love to share what I find and get your reaction.",
};

export async function generateScript(onboarding: OnboardingData | null, interviewer?: InterviewerInfo | null): Promise<InterviewScript> {
  if (!onboarding || (!onboarding.idea && !onboarding.problem && !onboarding.target_customer)) {
    return GENERIC_SCRIPT;
  }

  const featuresStr = onboarding.features.length > 0 ? onboarding.features.join(", ") : "not specified";

  const questionFocus = {
    behavior: true,
    pain: true,
    workflow: true,
    alternatives: true,
  };
  void questionFocus;

  const focusPriority = "Prioritize questions about workflow and analysis process.";

  const featureProbes = onboarding.features
    .map((f) => `Feature: "${f}" → probe: How do you handle this today? What do you do after this step?`)
    .join("\n");

  const interviewerLines = interviewer
    ? [
        interviewer.name ? `- Interviewer Name: ${interviewer.name}` : null,
        interviewer.context ? `- Interviewer Context: ${interviewer.context}` : null,
      ].filter(Boolean).join("\n")
    : null;

  const prompt = `You are generating a customer interview script for a first-time founder using "The Mom Test" principles.

INPUT:
- Idea: ${onboarding.idea}
- Problem: ${onboarding.problem}
- Target Customer: ${onboarding.target_customer}
- Features: ${featuresStr}${interviewerLines ? `\n\nINTERVIEWER:\n${interviewerLines}\n\nUse the interviewer name in the intro (e.g. "Hi, I'm [name]..."). Use the interviewer context to make questions feel natural given their background — but do NOT pitch or reveal the solution.` : ""}

QUESTION FOCUS RULES:
${focusPriority}

FEATURE-BASED INDIRECT PROBES (use these as inspiration for natural questions):
${featureProbes || "No specific features listed."}

CONTEXT USAGE RULES:
- Use context to guide question direction
- Do NOT pitch, validate, or directly reference the idea in a biased way
- The interview must feel natural, not like a survey

STRICT RULES:
- Do NOT ask for opinions (e.g. "Would you use this?")
- Do NOT ask hypotheticals (e.g. "If this existed...")
- Do NOT lead toward confirming the idea
- Focus ONLY on past behavior and real experiences
- Every question must extract specific, real examples

OUTPUT STRUCTURE (exactly 6 sections):
1. OPENING (2–3 questions) — casual context-building
2. INTERVIEWEE BACKGROUND (2–3 questions) — understand their role, experience level, and how relevant this problem is to their day-to-day life; use this to calibrate the rest of the interview
3. CURRENT BEHAVIOR (3–4 questions) — how they handle the problem today
4. PAIN & FRICTION (3–4 questions) — where the process breaks down
5. WORKAROUNDS / ALTERNATIVES (2–3 questions) — hacks and substitutes
6. IMPACT & PRIORITY (2–3 questions) — frequency and stakes

For EVERY main question include 1–2 follow-up probes such as:
"Can you walk me through the last time?", "What happened step-by-step?", "Why was that difficult?"

STYLE: Very casual, conversational, human — not scripted or corporate.

Return ONLY valid JSON matching this exact structure:
{
  "intro": "2–3 sentence opening that sets a relaxed tone without revealing the solution",
  "sections": [
    {
      "title": "string — section name",
      "questions": [
        {
          "question": "string — past-behavior, open-ended question",
          "probes": ["string", "string"]
        }
      ]
    }
  ],
  "closing": "2–3 sentence wrap-up that thanks them and asks for referrals"
}`;

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.7,
  });

  const raw = response.choices[0]?.message?.content ?? "";
  const parsed = JSON.parse(raw) as InterviewScript;
  return parsed;
}
