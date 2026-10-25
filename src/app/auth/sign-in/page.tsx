import Link from "next/link";
import { redirect } from "next/navigation";
import { BookMarked, ShieldCheck } from "lucide-react";
import { AuthButton } from "@/components/auth-button";
import { getAccountState } from "@/lib/supabase/account";
import { safeReturnPath } from "@/lib/dictionary/validation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const params = await searchParams;
  const next = safeReturnPath(params.next);
  const account = await getAccountState();
  if (account.user) redirect(next);
  return <div className="page-container">
    <section className="card sign-in-card" style={{ maxWidth: 560, margin: "4rem auto", padding: "2.5rem" }}>
      <BookMarked size={36} aria-hidden="true" />
      <p className="eyebrow">YOUR WORDS, IN ONE PLACE</p>
      <h1>Build your own dictionary.</h1>
      <p className="muted">Save terms as you read, add your own meanings, and return to the exact bill where you found them. Your dictionary is private and follows you across devices.</p>
      {params.error && <p role="alert" className="form-error">{params.error === "start" ? "We couldn’t start Google sign-in. Please try again. If this continues, open this page directly in Safari or Chrome." : params.error === "cancelled" ? "Sign-in was cancelled. Your unsaved draft stays in this tab so you can try again." : "Sign-in didn’t finish. Please try again. Your unsaved draft stays in this tab."}</p>}
      {!account.configured && <p className="notice">Google sign-in is not connected in this installation yet. Bill search, reading, and the public glossary are available without an account.</p>}
      {account.error && <p role="alert">{account.error}</p>}
      <AuthButton account={account} returnPath={next} />
      <p className="muted" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: ".85rem", marginTop: 24 }}><ShieldCheck size={18} aria-hidden="true" /> We use your Google account only to sign you in.</p>
      <Link href={next} className="text-link">Return to reading</Link>
    </section>
  </div>;
}
