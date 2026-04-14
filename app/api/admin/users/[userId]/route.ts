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

export async function DELETE(
  _req: Request,
  { params }: { params: { userId: string } | Promise<{ userId: string }> }
) {
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

  const resolvedParams = await Promise.resolve(params);
  const userId = resolvedParams?.userId?.trim();
  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  let adminClient;
  try {
    adminClient = createServiceRoleSupabaseClient();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Service role client unavailable";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const { error } = await adminClient.auth.admin.deleteUser(userId);
  if (error) {
    const { data: blockers, error: blockersError } = await adminClient.rpc(
      "list_auth_user_delete_blockers"
    );
    const typedBlockers = (blockers ?? []) as AuthUserDeleteRuleRow[];

    return NextResponse.json(
      {
        error: error.message,
        hint:
          "Confirm SUPABASE_SERVICE_ROLE_KEY is set and DB foreign keys from auth.users use ON DELETE CASCADE/SET NULL.",
        fkDeleteBlockers: blockersError ? undefined : typedBlockers,
        fkDeleteBlockersError: blockersError?.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
