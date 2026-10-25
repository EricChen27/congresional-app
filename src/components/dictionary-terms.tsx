"use client";
import { createContext, useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import type { GlossaryTerm } from '@/data/glossary';
import type { AccountState, DictionaryEntry } from '@/lib/dictionary/types';
import { deleteDictionaryEntry, saveDictionaryEntry } from '@/lib/dictionary/actions';
import { normalizeTerm } from '@/lib/dictionary/validation';
import { useRouter, usePathname } from 'next/navigation';
type Saved=Pick<DictionaryEntry,'id'|'term'|'glossaryId'>;
const DictionaryTerms=createContext<{entries:Saved[];setEntries:React.Dispatch<React.SetStateAction<Saved[]>>;account:AccountState;error?:string}|null>(null);
export function DictionaryTermsProvider({entries:initial,account,error,children}:{entries:Saved[];account:AccountState;error?:string;children?:React.ReactNode}){
 const [entries,setEntries]=useState(initial);
 // Refreshes reflect changes made from the dictionary page or another component.
 useEffect(()=>{
 // eslint-disable-next-line react-hooks/set-state-in-effect
 setEntries(initial);
 },[initial]);
 return <DictionaryTerms.Provider value={{entries,setEntries,account,error}}>{children}</DictionaryTerms.Provider>;
}
export function TermDictionaryButton({term}:{term:GlossaryTerm}){
 const state=useContext(DictionaryTerms);const router=useRouter();const pathname=usePathname();const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');const [needsAuth,setNeedsAuth]=useState(false);
 if(!state)return null;
 const matches=state.entries.filter(e=>e.glossaryId===term.id||[term.term,...term.aliases].some(t=>normalizeTerm(t)===normalizeTerm(e.term)));
 async function toggle(){if(!state)return;setBusy(true);setMessage('');try{
 if(matches.length){for(const entry of matches){const result=await deleteDictionaryEntry(entry.id);if(!result.ok){setMessage(result.error||'Could not remove this word.');setNeedsAuth(!!result.requiresAuth);return;}state.setEntries(items=>items.filter(e=>e.id!==entry.id));}setMessage('Removed from your dictionary.');}
 else{const result=await saveDictionaryEntry({term:term.term,definition:term.definition,definitionOrigin:'curated',glossaryId:term.id,definitionSourceUrl:term.sourceUrl});if(!result.ok||!result.id){setMessage(result.error||'Could not save this word.');setNeedsAuth(!!result.requiresAuth);return;}state.setEntries(items=>[...items,{id:result.id!,term:term.term,glossaryId:term.id}]);setMessage('Saved to your dictionary.');}router.refresh();
 }catch{setMessage('Your change could not be confirmed. Please reload before trying again.');}finally{setBusy(false);}}
 const returnPath=pathname||'/learn';
 return <div className="term-dictionary-action">{state.account.user&&!needsAuth?<button type="button" className="button button-secondary" disabled={busy||!!state.error} onClick={toggle}>{busy?'Please wait…':matches.length?'Remove from my dictionary':'Add to my dictionary'}</button>:state.account.configured?<Link className="text-link" href={`/auth/sign-in?next=${encodeURIComponent(returnPath)}`}>Sign in to save terms</Link>:<span className="muted">Connect accounts to save your own terms.</span>}{state.error&&<p role="alert">Your saved terms could not be loaded. Reload to try again.</p>}{message&&<p role="status">{message}</p>}</div>;
}
