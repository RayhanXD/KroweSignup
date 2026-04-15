import Link from "next/link";
import { createInterviewAuthClient } from "@/lib/supabaseAuth";
import Image from "next/image";

type AccountPageProps = {
  searchParams: Promise<{
    tab?: string;
  }>;
};

const TABS = ["profile", "security", "billing"] as const;

function getActiveTab(tab: string | undefined): (typeof TABS)[number] {
  if (tab && TABS.includes(tab as (typeof TABS)[number])) {
    return tab as (typeof TABS)[number];
  }
  return "profile";
}

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const params = await searchParams;
  const activeTab = getActiveTab(params.tab);
  const supabase = await createInterviewAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const fullName =
    typeof user?.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto w-full max-w-5xl p-4 sm:p-6">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-2.5 py-1">
              <Image src="/KroweIcon.png" alt="Krowe" width={14} height={14} className="rounded-[3px]" />
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Krowe platform
              </span>
            </div>
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Account</p>
            <h1 className="mt-1 text-xl font-semibold">Manage your workspace profile</h1>
          </div>
          <Link
            href="/interviews"
            className="rounded-md border border-border/70 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          >
            Back to dashboard
          </Link>
        </header>

        <section className="mb-4 rounded-xl border border-border/60 bg-card p-2">
          <div className="flex flex-wrap gap-2">
            <Link
              href="/interviews/account?tab=profile"
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                activeTab === "profile"
                  ? "bg-interview-brand-tint font-medium text-interview-brand"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              Profile
            </Link>
            <Link
              href="/interviews/account?tab=security"
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                activeTab === "security"
                  ? "bg-interview-brand-tint font-medium text-interview-brand"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              Security
            </Link>
            <Link
              href="/interviews/account?tab=billing"
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                activeTab === "billing"
                  ? "bg-interview-brand-tint font-medium text-interview-brand"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              Billing
            </Link>
          </div>
        </section>

        <section className="rounded-xl border border-border/60 bg-card p-4">
          {activeTab === "profile" && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold">Profile details</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-xs text-muted-foreground">Full name</span>
                  <input
                    type="text"
                    defaultValue={fullName}
                    placeholder="Your name"
                    className="w-full rounded-md border border-border/70 bg-background px-3 py-2 text-sm outline-none ring-0 transition-colors focus:border-interview-brand"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs text-muted-foreground">Email</span>
                  <input
                    type="email"
                    defaultValue={user?.email ?? ""}
                    disabled
                    className="w-full rounded-md border border-border/70 bg-muted/40 px-3 py-2 text-sm text-muted-foreground"
                  />
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                Profile save wiring can be connected to Supabase user metadata next.
              </p>
              <button
                type="button"
                className="rounded-md bg-gradient-to-br from-interview-brand to-interview-brand-end px-3 py-1.5 text-sm font-semibold text-primary-foreground opacity-70"
              >
                Save changes
              </button>
            </div>
          )}

          {activeTab === "security" && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold">Security</h2>
              <p className="text-sm text-muted-foreground">
                Change your password and authentication options from the auth settings flow.
              </p>
              <Link
                href="/auth/signin"
                className="inline-flex rounded-md border border-border/70 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
              >
                Open auth settings
              </Link>
            </div>
          )}

          {activeTab === "billing" && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold">Billing</h2>
              <p className="text-sm text-muted-foreground">
                Billing management is not configured yet. You can still route requests through support.
              </p>
              <Link
                href="mailto:support@krowe.com"
                className="inline-flex rounded-md border border-border/70 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
              >
                Contact support
              </Link>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
