"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { LogIn, LogOut } from "lucide-react";
import { safeReturnPath } from "@/lib/dictionary/validation";
import { DRAFT_KEY } from "@/lib/reader";
import { signOut } from "@/app/auth/actions";
import type { AccountState } from "@/lib/dictionary/types";

export function AuthButton({ account, returnPath, compact = false }: { account: AccountState; returnPath?: string; compact?: boolean }) {
  const pathname = usePathname();
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
    } catch { setError("The account service is temporarily unavailable. Please try again."); }
    finally { setBusy(false); }
  }
  if (!account.user && account.configured) {
    const href = `/auth/start?${new URLSearchParams({ next: safeReturnPath(returnPath || pathname) })}`;
    return <span className="auth-control"><a className={`button ${compact ? "button-secondary" : "button-primary"}`} href={href}
      onClick={(event) => {
        // Keep the exact document version/query when JavaScript is available.
        // The ordinary anchor still starts sign-in without hydration or browser Auth.
        event.currentTarget.href = `/auth/start?${new URLSearchParams({ next: safeReturnPath(returnPath || window.location.pathname + window.location.search) })}`;
      }}><LogIn size={16} aria-hidden="true" />{compact ? "Sign in" : "Continue with Google"}</a></span>;
  }
  return <span className="auth-control">
    <button className={`button ${account.user || compact ? "button-secondary" : "button-primary"}`} type="button" disabled={busy || !account.configured} onClick={handleClick} title={!account.configured ? "Google sign-in will be available when account services are connected." : undefined}>
      {account.user ? <LogOut size={16} aria-hidden="true" /> : <LogIn size={16} aria-hidden="true" />}
      {busy ? "Please wait…" : account.user ? "Sign out" : compact ? "Sign in" : "Continue with Google"}
    </button>
    {error && <span className="form-error" role="alert">{error}</span>}
  </span>;
}
