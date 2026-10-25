import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, ArrowUpRight } from "lucide-react";
import { SiteNav } from "@/components/site-nav";
import { AuthButton } from "@/components/auth-button";
import { getAccountState } from "@/lib/supabase/account";
import { DictionaryTermsProvider } from "@/components/dictionary-terms";
import { getDictionaryEntries } from "@/lib/dictionary/queries";
import { createClient } from "@/lib/supabase/server";
import { ThemeToggle } from "@/components/theme-toggle";
import "@fontsource/rubik/latin-500.css";
import "@fontsource/rubik/latin-600.css";
import "@fontsource/mukta-vaani/latin-500.css";
import "@fontsource/mukta-vaani/latin-600.css";
import "@fontsource/hind-siliguri/latin-400.css";
import "@fontsource/hind-siliguri/latin-600.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "BillBreakdown — Make sense of legislation", template: "%s | BillBreakdown" },
  description: "Explore congressional bills, read official summaries, and build your own legislative vocabulary. Understand the law before forming an opinion."
};
export default async function RootLayout({ children }: Readonly<{children:React.ReactNode}>) {
  const account = await getAccountState();
  let username:string|undefined;
  if(account.user){try{const client=await createClient();const result=await client?.from('member_profiles').select('username').eq('owner_id',account.user.id).maybeSingle();username=result?.data?.username;}catch{/* Account setup remains accessible during outages. */}}
  const dictionary = account.user ? await getDictionaryEntries() : null;
  return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:`try{var theme=localStorage.getItem('billbreakdown:theme');document.documentElement.dataset.theme=theme==='dark'||theme!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}catch{}`}}/></head><body><DictionaryTermsProvider account={account} entries={(dictionary?.entries||[]).map(({id,term,glossaryId})=>({id,term,glossaryId}))} error={dictionary?.error}>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header"><div className="header-inner">
      <Link href="/" className="brand" aria-label="BillBreakdown home"><span className="brand-mark"><BookOpen size={21}/></span>Bill<span className="brand-light">Breakdown</span><span className="beta-tag">BETA</span></Link>
      <SiteNav/><div className="header-account"><ThemeToggle/><Link className="button button-secondary" href={username?`/users/${username}`:"/account"}>View profile</Link><AuthButton account={account}/></div>
    </div></header>
    <main id="main">{children}</main>
    <footer className="site-footer"><div className="footer-inner"><div><Link href="/" className="brand footer-brand"><BookOpen size={20}/>BillBreakdown</Link><p>Understand the law before forming an opinion.</p></div><div className="footer-links"><Link href="/about">About & sources</Link><Link href="/glossary">Legislative glossary</Link><a href="https://www.congress.gov" target="_blank" rel="noreferrer">Congress.gov <ArrowUpRight size={14}/></a></div><p className="footer-note">Independent, nonpartisan civic education.<br/>An educational project, not an official government service.</p></div></footer>
  </DictionaryTermsProvider></body></html>;
}
