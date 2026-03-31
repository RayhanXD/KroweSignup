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

export async function generateScript(onboarding: OnboardingData | null): Promise<InterviewScript> {
  if (!onboarding || (!onboarding.idea && !onboarding.problem && !onboarding.target_customer)) {
    return GENERIC_SCRIPT;
  }

  const featuresStr = onboarding.features.length > 0 ? onboarding.features.join(", ") : "not specified";

  const prompt = `You are an expert customer discovery coach helping a founder prepare for user interviews.

The founder's startup context:
- Idea: ${onboarding.idea}
- Problem they're solving: ${onboarding.problem}
- Target customer: ${onboarding.target_customer}
- Planned features: ${featuresStr}

Generate a tailored interview script for this specific founder. The script should help them validate their assumptions and uncover real customer pain points.

Return ONLY valid JSON matching this exact structure:
{
  "intro": "string — a 2-3 sentence opening that introduces the interview purpose without revealing the solution",
  "sections": [
    {
      "title": "string — section name",
      "questions": [
        {
          "question": "string — open-ended question",
          "probes": ["string", "string", "string"] — 2-3 follow-up probes
        }
      ]
    }
  ],
  "closing": "string — a 2-3 sentence wrap-up that thanks them and asks for follow-up permission"
}

Include exactly 4 sections: Current Workflow, Pain Points, Solutions Tried, Ideal Outcome.
Each section should have 2 questions. Each question should have 2-3 probes.
Make all questions specific to the founder's context — reference their target customer type and problem domain naturally.
Use conversational, non-leading language. Do NOT mention the startup's solution or product.`;

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
