"use client";

import {useEffect, useMemo, useState} from "react";
import { useRouter } from "next/navigation";
import { StepKey, getFirstStepKey, normalizeStepKey } from "@/lib/signupSteps";
import type { SessionState } from "@/lib/types/session";
import type { SubmitAnswerResponse, ConfirmAnswerResponse } from "@/lib/types/answers";

const PRELOADER_MIN_MS = 2500

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return "unknown error"
}

function sleepRemaining(startTime: number, minMs: number) {
  const elapsed = Date.now() - startTime
  const remaining = Math.max(0, minMs - elapsed)
  return remaining > 0 ? new Promise<void>((r) => setTimeout(r, remaining)) : Promise.resolve()
}

export function useSignupSession(){
    const router = useRouter();
    const [state, setState] = useState<SessionState>({
        sessionId: null,
        currentStepKey: getFirstStepKey(),
        answersByStepKey: {},
        loading: true,
        error: null,
    });

    useEffect(() => {
        const startTime = Date.now();
        (async () => {
            try {
                const res = await fetch("/api/signup/session/start", { method: "POST" });
                const json = await res.json();
                if (!res.ok) throw new Error(json?.error || "failed to start session");
                if (json.status === "completed") {
                    router.replace("/interviews");
                    return;
                }
                await sleepRemaining(startTime, PRELOADER_MIN_MS);
                setState((s) => ({
                    ...s,
                    sessionId: json.sessionId,
                    currentStepKey: normalizeStepKey(
                        String(json.currentStepKey ?? getFirstStepKey())
                    ),
                    answersByStepKey: json.answersByStepKey || {},
                    loading: false,
                    error: null,
                }));
            } catch (e: unknown) {
                await sleepRemaining(startTime, PRELOADER_MIN_MS);
                setState((s) => ({ ...s, loading: false, error: getErrorMessage(e) }));
            }
        })();
    }, []);

    const setAnswerLocal = (stepKey: StepKey, value: string) => {
        setState((s) => ({
            ...s,
            answersByStepKey: {...s.answersByStepKey, [stepKey]: value},
        }));
    };

    const submitAnswer = async (stepKey: StepKey, value: string, force = false) => {
        if(!state.sessionId) throw new Error ("No session");

        const res = await fetch("/api/signup/answer",{
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                sessionId: state.sessionId,
                stepKey,
                answerText: value,
                force,
            }),
        });

        const json = await res.json();
        if(!res.ok) throw new Error(json?.error || "Failed to save answer") 

        //advancing here only happens due to confirmAnswer()


        
        setState((s) => ({
            ...s,
            currentStepKey: json.nextStepKey
                ? normalizeStepKey(String(json.nextStepKey))
                : s.currentStepKey,
        }));

        return json as SubmitAnswerResponse;
    };


    const confirmAnswer = async (
        stepKey: StepKey,
        finalAnswer: string,
        finalSource: "original" | "ai_suggested" | "user_edited" | "override"
    ) => { 
        if (!state.sessionId) throw new Error("No session");

        const res = await fetch ("/api/signup/answer/confirm", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                sessionId: state.sessionId,
                stepKey,
                finalAnswer,
                finalSource,
            }),
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "failed to confirm answer");

        //confirm route advances session, so update current step here
        if (json.nextStepKey) {
            setState((s) => ({
                ...s,
                currentStepKey: normalizeStepKey(String(json.nextStepKey)),
            }));
        }

        //keep local answer in sync
        setState((s) => ({
            ...s,
            answersByStepKey: {...s.answersByStepKey, [stepKey]: finalAnswer},
        }));

        return json as ConfirmAnswerResponse;
    }

    return useMemo(
        () => ({
            ...state,
            setAnswerLocal,
            submitAnswer,
            confirmAnswer,
        }),
        [state]
    );
}