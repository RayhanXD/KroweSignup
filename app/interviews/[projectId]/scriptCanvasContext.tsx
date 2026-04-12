"use client";

import { createContext, useContext } from "react";

export type ScriptCanvasContextValue = {
  moveQuestion: (sectionIndex: number, questionIndex: number, delta: -1 | 1) => void;
};

const ScriptCanvasContext = createContext<ScriptCanvasContextValue | null>(null);

export function ScriptCanvasProvider({
  value,
  children,
}: {
  value: ScriptCanvasContextValue;
  children: React.ReactNode;
}) {
  return <ScriptCanvasContext.Provider value={value}>{children}</ScriptCanvasContext.Provider>;
}

export function useScriptCanvas(): ScriptCanvasContextValue {
  const v = useContext(ScriptCanvasContext);
  if (!v) {
    throw new Error("useScriptCanvas must be used within ScriptCanvasProvider");
  }
  return v;
}
