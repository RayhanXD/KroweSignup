import { NextResponse } from "next/server";
import { createInterviewAuthClient } from "@/lib/supabaseAuth";
import { getPostLoginDestination } from "@/lib/authPostLoginDestination";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  if (code) {
    const supabase = await createInterviewAuthClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      const next = searchParams.get("next");
      const destination = await getPostLoginDestination(supabase, data.user.id, next);
      return NextResponse.redirect(`${origin}${destination}`);
    }
  }
  return NextResponse.redirect(`${origin}/auth/signin?error=auth_failed`);
}
