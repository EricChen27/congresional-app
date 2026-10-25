import { BookMarked, LockKeyhole } from "lucide-react";
import { AuthButton } from "@/components/auth-button";
import { DictionaryManager } from "@/components/dictionary-manager";
import { getAccountState } from "@/lib/supabase/account";
import { getDictionaryEntries } from "@/lib/dictionary/queries";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "My dictionary", robots: { index: false, follow: false } };

export default async function DictionaryPage() {
  const account = await getAccountState();
  const data = account.user ? await getDictionaryEntries() : null;
  return <div className="page-container">
    <header className="page-heading">
      <p className="eyebrow">A LITTLE CLEARER, EVERY TIME</p>
      <h1>My dictionary<span style={{ color: "var(--green, #2b6a4f)" }}>.</span></h1>
      <p className="muted">The words you discover. The meanings you make your own.</p>
    </header>
    {account.user ? <>
      <p className="muted" style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 24, fontSize: ".85rem" }}><LockKeyhole size={15} aria-hidden="true" /> Private to your account · Saved across devices</p>
      {data?.error ? <section className="card notice" role="alert"><h2>We couldn’t load your words.</h2><p>{data.error}</p><a href="/dictionary" className="button button-secondary">Try again</a></section> : <DictionaryManager entries={data?.entries || []} />}
    </> : <section className="card empty-state" style={{ padding: "3rem", maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
      <BookMarked size={40} aria-hidden="true" style={{ margin: "0 auto 16px" }} />
      <h2>A place for your growing understanding.</h2>
      <p className="muted">Highlight words as you read, save their context, and write definitions that make sense to you. Sign in with Google to keep your private dictionary on any device.</p>
      {!account.configured && <p className="notice">Account services aren’t connected in this installation yet. You can still read bills and use the public glossary.</p>}
      {account.error && <p role="alert">{account.error}</p>}
      <AuthButton account={account} returnPath="/dictionary" />
    </section>}
  </div>;
}
