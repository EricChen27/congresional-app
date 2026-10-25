import Link from "next/link";
import { ArrowRight, BookOpen, Search, Sparkles, Quote, Check, LibraryBig, Route, BookmarkPlus, ArrowUpRight } from "lucide-react";
import { listBills } from "@/lib/bills";
import { BillCard, formatDate } from "@/components/bill-card";
import { GlossaryText } from "@/components/glossary-text";

export default async function Home() {
  const bills=await listBills();
  const featured=bills.filter(b=>b.featured).slice(0,3);
  const displayed=featured.length?featured:bills.slice(0,3);
  const updated=bills.map(b=>b.retrievedAt).sort().at(-1);
  return <>
    <section className="hero page-container"><div className="hero-copy"><div className="eyebrow"><span className="eyebrow-dot"/> 119th Congress · 2025–2026</div>
      <h1>Big bills.<br/><em>Clearer</em> understanding.</h1>
      <p className="hero-description">Legislation shapes our lives. Let’s make it easier to understand. Explore House and Senate bills from the 119th Congress (2025–2026), unpack unfamiliar words, and form your own opinion.</p>
      <p className="coverage-note">Our bill catalog covers the 119th Congress only. <Link href="/about">See what’s included →</Link></p>
      <form action="/bills" className="hero-search"><Search size={21}/><label className="sr-only" htmlFor="home-search">Search bills by topic, title, or number</label><input id="home-search" name="q" placeholder="Try a topic, a bill title, or H.R. 1"/><button className="button button-primary" type="submit">Explore bills <ArrowRight size={17}/></button></form>
      <div className="popular-topics"><span>A place to start</span>{["Health","Education","Technology"].map(topic=><Link key={topic} href={`/bills?q=${topic}`}>{topic}<ArrowUpRight size={12}/></Link>)}</div>
      <div className="hero-assurances"><span><Check size={14}/> Official sources</span><span><Check size={14}/> No political spin</span><span><Check size={14}/> Open to everyone</span></div>
    </div><div className="hero-visual" aria-label="Preview of the legislative glossary"><span className="visual-corner top-left"/><span className="visual-corner bottom-right"/>
      <div className="document-preview"><div className="document-topline"><span><BookOpen size={15}/> THE LEGISLATION READER</span><span>01 / 03</span></div><div className="document-rule"/><span className="document-kicker">A WORD YOU’LL SEE IN CONGRESS</span><h2>Every word is<br/>a way in.</h2><p className="document-sentence"><GlossaryText text="A bill may be referred to a committee for consideration before the full chamber takes action."/></p><div className="document-lines"><span/><span/><span/></div><div className="document-bottom"><span className="mini-dot"/> Select a word. Build your understanding.</div></div>
      <div className="definition-preview"><div className="definition-preview-icon"><Quote size={19}/></div><div><div className="eyebrow">YOUR GLOSSARY, IN CONTEXT</div><strong>committee</strong><p>A group of legislators that considers matters within its assigned responsibilities.</p><Link href="/glossary">Get to know the language <ArrowRight size={14}/></Link></div></div>
    </div></section>
    <section className="trust-strip"><div className="page-container"><span className="trust-heading"><LibraryBig size={19}/> Real legislation. Traceable sources.</span><span>Official congressional summaries</span><span>Source links on every bill</span><span>Clear dates & versions</span></div></section>
    <section className="page-container featured-section"><div className="section-heading"><div><div className="eyebrow">START EXPLORING</div><h2>A few bills. A bigger picture.</h2><p>Take a closer look at legislation across different policy areas.</p></div><Link className="text-link" href="/bills">Browse all bills <ArrowRight size={17}/></Link></div><div className="bill-grid">{displayed.map(bill=><BillCard key={bill.id} bill={bill}/>)}</div><p className="coverage-note">{bills.length} bills in this catalog · 119th Congress · Retrieved {formatDate(updated)}. <Link href="/about">About our coverage</Link></p></section>
    <section className="how-section"><div className="page-container"><div className="section-heading"><div><div className="eyebrow">FROM COMPLICATED TO CONNECTED</div><h2>Your curiosity does the rest.</h2></div><p className="section-aside">You don’t need a background in government.<br/>Just a question you want to explore.</p></div><div className="how-grid">{[
      {icon:Search,n:"01",title:"Find what matters to you",text:"Explore topics you care about and find the bills behind them."},
      {icon:Route,n:"02",title:"Follow the full story",text:"Read an official summary, see the original text, and follow the documented timeline."},
      {icon:BookmarkPlus,n:"03",title:"Make the words your own",text:"Look up a term, save it to your dictionary, and keep learning as you read."}
    ].map(item=><div className="how-card" key={item.n}><div className="how-top"><item.icon size={25}/><span>{item.n}</span></div><h3>{item.title}</h3><p>{item.text}</p></div>)}</div></div></section>
    <section className="page-container"><div className="glossary-banner"><span className="glossary-banner-icon"><Sparkles size={28}/></span><div><div className="eyebrow">A SMALL WORD CAN MAKE A BIG DIFFERENCE</div><h2>Cloture? Markup? Start here.</h2><p>Civic terms and organizations, explained in everyday language.</p></div><Link href="/glossary" className="button button-primary">Open the glossary <ArrowRight size={17}/></Link></div></section>
  </>;
}
