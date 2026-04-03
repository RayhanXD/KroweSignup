import { NextResponse } from "next/server";
import { createInterviewAuthClient } from "@/lib/supabaseAuth";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  if (code) {
    const supabase = await createInterviewAuthClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      const next = searchParams.get("next");
      if (next && next.startsWith("/")) {
        return NextResponse.redirect(`${origin}${next}`);
      }
      const { data: existing } = await supabase
        .from("interview_projects")
        .select("id")
        .eq("user_id", data.user.id)
        .limit(1)
        .single();
      const destination = existing ? "/interviews" : "/interviews/new";
      return NextResponse.redirect(`${origin}${destination}`);
    }
  }
  return NextResponse.redirect(`${origin}/auth/signin?error=auth_failed`);
}
