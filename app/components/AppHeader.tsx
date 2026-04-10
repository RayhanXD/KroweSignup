"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

type AppHeaderProps = {
  backHref?: string;
  backLabel?: string;
};

export default function AppHeader({ backHref, backLabel }: AppHeaderProps) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    await supabase.auth.signOut();
    router.push("/auth/signin");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Link href="/interviews">
            <img src="/KroweLogo.png" alt="Krowe" className="h-8 w-auto" />
          </Link>
          {backHref && (
            <>
              <span className="text-zinc-300">/</span>
              <Link
                href={backHref}
                className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
              >
                {backLabel ?? "Back"}
              </Link>
            </>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          Log out
        </button>
      </div>
    </header>
  );
}
