"use client";

import {useEffect, useMemo, useState} from "react";
import {StepKey, getFirstStepKey} from "@/lib/signupSteps"

const STORAGE_KEY = "krowe_signup_session_id"

type SessionState = {
    sessionId: string | null;
    currentStepKey: StepKey;
    answersByStepKey: Record<string, string>;
    loading: boolean;
    error: string | null;
};

export function useSignupSession(){
    const [state, setState] = useState<SessionState>({
        sessionId: null,
        currentStepKey: getFirstStepKey(),
        answersByStepKey: {},
        loading: true,
        error: null,
    });

    useEffect(() => {
        const existing = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY): null;

        async function startNew(){
            const res = await fetch("/api/signup/session/start", {method: "POST"});
            const json = await res.json();

            if (!res.ok) throw new Error(json?.error || "failed to start session");

            localStorage.setItem(STORAGE_KEY, json.sessionId);
            setState((s) => ({
                ...s,
                sessionId: json.sessionId,
                currentStepKey: (json.currentStepKey ?? getFirstStepKey()),
                loading: false,
                error: null,
            }));
        }

        async function resume(sessionId: string){
            const res = await fetch (`/api/signup/session/${sessionId}`);
            const json = await res.json();

            if (!res.ok){
                localStorage.removeItem(STORAGE_KEY);
                return startNew();
            }

            setState((s) => ({
                ...s,
                sessionId,
                currentStepKey: json.currentStepKey,
                answersByStepKey: json.answersByStepKey || {},
                loading: false,
                error: null,
            }));
        }

        (async () => {
            try {
                if (existing) await resume(existing);
                else await startNew();
            } catch (e: any){
                setState((s) => ({
                    ...s,
                    loading: false,
                    error: e?.message || "unknown error",
                }));
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
        
        setState((s) => ({
            ...s,
            currentStepKey: json.nextStepKey ?? s.currentStepKey,
        }));

        return json as {
            validationStatus: "ok" | "needs_fix";
            nextStepKey: StepKey | null;
            issues: any[];
            failCount: number;
            canContinueWithWarning: boolean;
        };
    };

    return useMemo(
        () => ({
            ...state,
            setAnswerLocal,
            submitAnswer,
        }),
        [state]
    );
}