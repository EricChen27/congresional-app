"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, ChevronsLeft, ChevronsRight, Search, SearchX } from "lucide-react";
import type { CatalogPage } from "@/lib/bills/catalog-query";
import { pageWindow } from "@/lib/pagination";
import { BillCard, formatDate } from "./bill-card";
import { SelectMenu } from "./select-menu";
export function BillExplorer({initialData,forum=false}:{forum?:boolean;initialData:CatalogPage}){
 const [filters,setFilters]=useState(initialData.filters);
 const [requested,setPage]=useState(initialData.page);
 const [result,setResult]=useState(initialData);
 const [error,setError]=useState('');const [retry,setRetry]=useState(0);
 const key=JSON.stringify([filters,requested]);
 const [loadedKey,setLoadedKey]=useState(key);
 const loading=key!==loadedKey;
 const {bills:filtered,categories,pages,page,info,total,missingExact:exact}=result;
 useEffect(()=>{
  if(key===loadedKey&&retry===0)return;
  const controller=new AbortController();
  const timer=setTimeout(async()=>{
   const q=new URLSearchParams();for(const [k,v] of Object.entries(filters))if(v)q.set(k==='query'?'q':k,v);q.set('page',String(requested));
   try{const response=await fetch(`/api/bills?${q}`,{signal:controller.signal});if(!response.ok)throw new Error();const data:CatalogPage=await response.json();if(!controller.signal.aborted){setResult(data);setLoadedKey(key);setError('');}}
   catch{if(!controller.signal.aborted)setError('Search could not be updated. The previous results are shown below.');}
  },200);
  return()=>{clearTimeout(timer);controller.abort();};
 // loadedKey is the completion marker, not a new search input.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[key,retry]);
 function change(key:keyof typeof filters,value:string){setError('');setFilters(f=>({...f,[key]:value}));setPage(1);}
 function reset(){setError('');setFilters({query:'',category:'',chamber:'',summary:'',voting:'',year:'',sort:''});setPage(1);}
 useEffect(()=>{const q=new URLSearchParams();for(const [key,value] of Object.entries(filters)){if(value)q.set(key==='query'?'q':key,value);}if(requested>1)q.set('page',String(requested));window.history.replaceState(null,'',`${forum?'/forum':'/bills'}${q.size?'?'+q:''}`);},[filters,requested,forum]);
 useEffect(()=>{const restore=()=>{const q=new URLSearchParams(window.location.search);setFilters({query:q.get('q')||'',category:q.get('category')||'',chamber:q.get('chamber')||'',summary:q.get('summary')||'',voting:q.get('voting')||'',year:q.get('year')||'',sort:q.get('sort')||''});setPage(Math.max(1,Number(q.get('page'))||1));};window.addEventListener('popstate',restore);return()=>window.removeEventListener('popstate',restore);},[]);
 return <div className="page-container browse-page">{!forum&&<header className="page-heading"><div className="eyebrow">FIND YOUR WAY INTO LEGISLATION</div><h1>Follow your <em>curiosity.</em></h1><p>Find a bill, explore its official summary, and understand the steps it has taken.</p></header>}
 <div className="browse-toolbar"><div className="search-field"><Search size={19}/><label className="sr-only" htmlFor="bill-query">Search by title, keyword, or bill number</label><input className="field" type="search" id="bill-query" value={filters.query} onChange={e=>change('query',e.target.value)} placeholder="Search a topic, title, or bill number…" maxLength={200}/></div><div className="browse-filter-row">
 <SelectMenu label="Policy area" value={filters.category} onChange={v=>change('category',v)} options={[{value:'',label:'All policy areas'},...categories.map(c=>({value:c,label:c}))]}/>
 <SelectMenu label="Chamber" value={filters.chamber} onChange={v=>change('chamber',v)} options={[{value:'',label:'House & Senate'},{value:'house',label:'House of Representatives'},{value:'senate',label:'Senate'}]}/>
 <SelectMenu label="Official summary" value={filters.summary} onChange={v=>change('summary',v)} options={[{value:'',label:'With & without summaries'},{value:'with',label:'With official summary'},{value:'without',label:'Without official summary'}]}/>
 <SelectMenu label="Voting status" value={filters.voting} onChange={v=>change('voting',v)} options={[{value:'',label:'All voting statuses'},{value:'voted',label:'Voted'},{value:'not-voted',label:'Not voted yet'}]}/>
 <SelectMenu label="Year introduced" value={filters.year} onChange={v=>change('year',v)} options={[{value:'',label:'2025 & 2026'},{value:'2025',label:'2025'},{value:'2026',label:'2026'}]}/>
 <SelectMenu label="Sort by" value={filters.sort} onChange={v=>change('sort',v)} options={[{value:'',label:'Latest action'},{value:'introduced',label:'Introduced: newest (2026 first)'},{value:'introduced-oldest',label:'Introduced: oldest (2025 first)'},{value:'title',label:'Title A–Z'},{value:'summary-first',label:'Summaries first'},{value:'no-summary-first',label:'Missing summaries first'}]}/>
 </div></div>
 {filters.voting&&<p className="muted">“Voted” includes documented committee and floor votes, procedural votes, and passage by unanimous consent. “Not voted yet” means no such action appears in this dated catalog; it is not a live status.</p>}
 <div className="browse-result-bar"><span role="status" aria-live="polite"><strong>{total}</strong> {total===1?'bill':'bills'}{result.filters.query?` matching “${result.filters.query}”`:' to explore'} · {info.congress}th Congress</span>{Object.values(filters).some(Boolean)?<button className="text-link plain-button" onClick={reset}>Clear filters</button>:<span>Catalog retrieved {formatDate(info.retrievedAt)}</span>}</div>
 {!forum&&exact&&<div className="notice"><p>This bill isn’t in the imported catalog.</p><Link className="text-link" href={`/bills/${exact.congress}/${exact.type}/${exact.number}`}>Look up {exact.type==='hr'?'H.R.':'S.'} {exact.number} · {exact.congress}th Congress <ArrowRight size={15}/></Link></div>}
 {loading&&!error&&<p role="status">Updating results…</p>}{error&&<p className="notice" role="alert">{error} <button className="text-link plain-button" onClick={()=>{setError('');setRetry(n=>n+1);}}>Retry</button></p>}
 <section aria-label="Search results" aria-busy={loading&&!error}>
 {filtered.length?<div className="bill-grid">{filtered.map(b=>forum?<article className="card learn-card" key={b.id}><span className="eyebrow">{b.billType==='hr'?'H.R.':'S.'} {b.number} · {b.congress}th Congress</span><h2>{b.title}</h2><p className="muted">{b.category}</p><Link className="text-link" href={`/forum/${b.congress}/${b.billType}/${b.number}`}>Open discussion →</Link></article>:<BillCard key={b.id} bill={b}/>)}</div>:<div className="card empty-state"><SearchX size={35}/><h2>No bills match those filters.</h2><p>Try a broader topic or clear a filter. Include a Congress for older bills, such as “118 H.R. 1.”</p><button className="button button-secondary" onClick={reset}>Browse the catalog</button></div>}
 {pages>1&&<nav className="pagination numbered-pagination" aria-label="Bill results pages"><button className="button button-secondary" aria-label="First page" disabled={loading||page===1} onClick={()=>setPage(1)}><ChevronsLeft size={18}/></button>{pageWindow(page,pages).map(n=><button key={n} disabled={loading} className={`button ${n===page?'button-primary':'button-secondary'}`} aria-label={`Page ${n}`} aria-current={n===page?'page':undefined} onClick={()=>setPage(n)}>{n}</button>)}<button className="button button-secondary" aria-label="Last page" disabled={loading||page===pages} onClick={()=>setPage(pages)}><ChevronsRight size={18}/></button><span>Page {page} of {pages}</span></nav>}
 </section><p className="coverage-note">Search covers {info.count} imported bills and their available summaries. {info.selection} <Link href="/about">Sources & coverage</Link></p></div>;
}
