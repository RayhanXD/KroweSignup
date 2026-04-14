import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Business Profile completion is now driven by onboarding completion. Complete onboarding in signup.",
    },
    { status: 405 }
  );
}
