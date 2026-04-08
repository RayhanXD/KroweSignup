import { NextResponse } from "next/server";
import { createInterviewAuthClient } from "@/lib/supabaseAuth";
import { getPostLoginDestination } from "@/lib/authPostLoginDestination";

export async function GET(request: Request) {
  const supabase = await createInterviewAuthClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const next = searchParams.get("next");
  const destination = await getPostLoginDestination(supabase, user.id, next);

  return NextResponse.json({ destination });
}
