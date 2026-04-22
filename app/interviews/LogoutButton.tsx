"use client";

import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

export default function LogoutButton() {
  const router = useRouter();

  return (
    <button
      onClick={async () => {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        await supabase.auth.signOut();
        router.push("/auth/signin");
      }}
      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
    >
      <span className="material-symbols-outlined text-base" aria-hidden>
        logout
      </span>
      Log out
    </button>
  );
}
