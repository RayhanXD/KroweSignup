import { NextResponse } from "next/server";
import { createInterviewAuthClient } from "@/lib/supabaseAuth";
import { createServiceRoleSupabaseClient } from "@/lib/supabaseServer";

type AuthUserDeleteRuleRow = {
  table_schema: string;
  table_name: string;
  column_name: string;
  constraint_name: string;
  delete_rule: string;
};

export async function GET() {
  const authClient = await createInterviewAuthClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminEmail = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  if (!adminEmail) {
    return NextResponse.json(
      { error: "ADMIN_EMAIL is not configured" },
      { status: 500 }
    );
  }

  if ((user.email ?? "").trim().toLowerCase() !== adminEmail) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let adminClient;
  try {
    adminClient = createServiceRoleSupabaseClient();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Service role client unavailable";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const rulesRes = await adminClient.rpc("list_auth_user_fk_delete_rules");
  const blockersRes = await adminClient.rpc("list_auth_user_delete_blockers");

  if (rulesRes.error) {
    return NextResponse.json(
      {
        error: rulesRes.error.message,
        hint:
          "Run migration 022_auth_user_delete_diagnostics.sql to install diagnostics functions.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    rules: (rulesRes.data ?? []) as AuthUserDeleteRuleRow[],
    blockers: (blockersRes.data ?? []) as AuthUserDeleteRuleRow[],
    blockersError: blockersRes.error?.message,
  });
}
