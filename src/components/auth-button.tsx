"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { safeReturnPath } from "@/lib/dictionary/validation";
import { DRAFT_KEY } from "@/lib/reader";
import { signOut } from "@/app/auth/actions";
import type { AccountState } from "@/lib/dictionary/types";

export function AuthButton({ account, returnPath, compact = false }: { account: AccountState; returnPath?: string; compact?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function handleClick() {
    setBusy(true);
    setError("");
    try {
      if (account.user) {
        const result = await signOut();
        if (!result.ok) { setError(result.error || "Could not sign out."); return; }
        try { sessionStorage.removeItem(DRAFT_KEY); sessionStorage.removeItem("billbreakdown:manager-draft:v1"); } catch { /* Storage may be unavailable. */ }
        // A full navigation also discards private entries held in the browser's router cache.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload clears the previous user's private router cache
        window.location.assign("/");
        return;
      }
      const client = createClient();
      if (!client) { setError("Sign-in is not connected yet. You can still explore every public feature."); return; }
      const next = safeReturnPath(returnPath || window.location.pathname + window.location.search);
      const callback = new URL("/auth/callback", window.location.origin);
      callback.searchParams.set("next", next);
      const { error: authError } = await client.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: callback.toString(), queryParams: { prompt: "select_account" } },
      });
      if (authError) setError("We couldn’t start Google sign-in. Please try again.");
      else router.refresh();
    } catch { setError("The account service is temporarily unavailable. Please try again."); }
    finally { setBusy(false); }
  }
  return <span className="auth-control">
    <button className={`button ${account.user || compact ? "button-secondary" : "button-primary"}`} type="button" disabled={busy || !account.configured} onClick={handleClick} title={!account.configured ? "Google sign-in will be available when account services are connected." : undefined}>
      {account.user ? <LogOut size={16} aria-hidden="true" /> : <LogIn size={16} aria-hidden="true" />}
      {busy ? "Please wait…" : account.user ? "Sign out" : compact ? "Sign in" : "Continue with Google"}
    </button>
    {error && <span className="form-error" role="alert">{error}</span>}
  </span>;
}
