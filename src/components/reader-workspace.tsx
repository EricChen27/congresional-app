"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { BookmarkPlus, Check, Plus, X, ExternalLink, Highlighter } from "lucide-react";
import { GlossaryText } from "@/components/glossary-text";
import { AuthButton } from "@/components/auth-button";
import { saveDictionaryEntry } from "@/lib/dictionary/actions";
import { findGlossaryTerm } from "@/lib/glossary";
import { DRAFT_KEY, extractSelectionContext, makeDictionaryDraft, parseStoredDraft } from "@/lib/reader";
import type { AccountState,DictionaryContext,DictionaryDraft } from "@/lib/dictionary/types";

type Props={text:string;context:Omit<DictionaryContext,"selectedText"|"excerpt">;account:AccountState;fullText?:boolean};
export function ReaderWorkspace({text,context,account,fullText=false}:Props){
 const container=useRef<HTMLDivElement>(null);const dialog=useRef<HTMLDialogElement>(null);const previousFocus=useRef<HTMLElement|null>(null);
 const [selection,setSelection]=useState<{term:string;excerpt:string}|null>(null);const [draft,setDraft]=useState<DictionaryDraft|null>(null);const [error,setError]=useState("");const [saved,setSaved]=useState(false);const [requiresAuth,setRequiresAuth]=useState(false);const [busy,startTransition]=useTransition();
 function openDraft(value:DictionaryDraft){previousFocus.current=document.activeElement as HTMLElement;setDraft(value);setError("");setSaved(false);setRequiresAuth(false);}
 useEffect(()=>{const onSelection=()=>{if(container.current)setSelection(extractSelectionContext(container.current,window.getSelection()));};document.addEventListener("selectionchange",onSelection);return()=>document.removeEventListener("selectionchange",onSelection);},[]);
 useEffect(()=>{let stored:DictionaryDraft|null=null;try{stored=parseStoredDraft(sessionStorage.getItem(DRAFT_KEY),window.location.pathname+window.location.search);}catch{/* Storage can be unavailable in private mode. */}if(stored){
 // Restore a user-authored draft only on this same reader after the OAuth redirect.
 // eslint-disable-next-line react-hooks/set-state-in-effect
 setDraft(stored);
 }},[]);
 useEffect(()=>{if(draft&&!dialog.current?.open)dialog.current?.showModal();},[draft]);
 useEffect(()=>{if(!draft)return;try{sessionStorage.setItem(DRAFT_KEY,JSON.stringify({path:window.location.pathname+window.location.search,expires:Date.now()+30*60*1000,draft}));}catch{/* The active draft still works without browser storage. */}},[draft]);
 function close(){if(busy)return;dialog.current?.close();setDraft(null);setError("");setSaved(false);try{sessionStorage.removeItem(DRAFT_KEY);}catch{}previousFocus.current?.focus();}
 function addSelection(){if(!selection)return;openDraft(makeDictionaryDraft(selection.term,{...context,selectedText:selection.term,excerpt:selection.excerpt}));}
 function updateTerm(value:string){if(!draft)return;const canonical=findGlossaryTerm(value);const prior=findGlossaryTerm(draft.term);const untouched=!draft.definition||draft.definition===prior?.definition;setDraft({...draft,term:value,definition:untouched?canonical?.definition||"":draft.definition,definitionOrigin:untouched?(canonical?"curated":"unset"):"personal",glossaryId:canonical?.id,definitionSourceUrl:untouched?canonical?.sourceUrl:undefined,context:draft.context?{...draft.context,selectedText:draft.context.excerpt ? draft.context.selectedText : value.trim().slice(0,160)}:undefined});}
 function save(event:React.FormEvent){event.preventDefault();if(!draft)return;setError("");startTransition(async()=>{try{const result=await saveDictionaryEntry(draft);if(result.ok){setSaved(true);try{sessionStorage.removeItem(DRAFT_KEY);}catch{}}else{setError(result.error||"Your word wasn’t saved. Please try again.");setRequiresAuth(!!result.requiresAuth);}}catch{setError("Your word wasn’t saved. Check your connection and try again; your draft is still here.");}});}
 return <><div className="reader-controls"><p><Highlighter size={12} style={{display:"inline",verticalAlign:"middle",marginRight:5}}/> Select a word or phrase to make it part of your dictionary.</p><button type="button" className="button button-secondary" onMouseDown={e=>e.preventDefault()} onClick={addSelection} disabled={!selection}><BookmarkPlus size={14}/>Add selected word</button><button type="button" className="button button-secondary" onClick={()=>openDraft(makeDictionaryDraft("",{...context,selectedText:"",excerpt:""}))}><Plus size={14}/>Add word</button></div>
 <div ref={container} className={`document-content ${fullText?"full-text":""}`} tabIndex={0} aria-label={fullText?"Official legislative text; select words to save":"Official summary; select words to save"}>{text.split(/\n\s*\n/).filter(Boolean).map((paragraph,i)=><p key={i}><GlossaryText text={paragraph}/>{"\n\n"}</p>)}</div>
 <dialog ref={dialog} className="word-dialog" aria-labelledby="word-dialog-title" onCancel={e=>{e.preventDefault();close();}} onClick={e=>{if(e.target===e.currentTarget){const rect=e.currentTarget.getBoundingClientRect();if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)close();}}}>
 {draft&&<><div className="dialog-top"><div><div className="eyebrow">YOUR PERSONAL DICTIONARY</div><h2 id="word-dialog-title">{saved?"A new piece of understanding.":"Make this word your own."}</h2></div><button type="button" className="icon-button" onClick={close} disabled={busy} aria-label="Close dictionary dialog"><X size={17}/></button></div>
 {saved?<><p className="notice" role="status"><Check size={16} style={{display:"inline",verticalAlign:"middle",marginRight:7}}/>“{draft.term}” is saved. If you already had this word, its existing definition was kept and this source was added.</p><div className="dialog-actions"><Link href="/dictionary" className="button button-primary">Open my dictionary</Link><button className="button button-secondary" onClick={close}>Keep reading</button></div></>:<form onSubmit={save}>
 <label className="label" htmlFor="selected-term">Word or short phrase</label><input className="field" id="selected-term" maxLength={100} required value={draft.term} onChange={e=>updateTerm(e.target.value)} autoComplete="off"/>
 <label className="label" htmlFor="selected-definition">Your definition <span className="muted">(optional)</span></label><textarea className="field" id="selected-definition" maxLength={4000} rows={4} placeholder="Write a meaning in your own words, or come back to it later." value={draft.definition} onChange={e=>setDraft({...draft,definition:e.target.value,definitionOrigin:e.target.value?"personal":"unset",definitionSourceUrl:undefined})}/>
 {draft.definitionOrigin==="curated"&&draft.definitionSourceUrl&&<a className="text-link" style={{fontSize:11}} href={draft.definitionSourceUrl} target="_blank" rel="noreferrer">Prefilled from our sourced glossary <ExternalLink size={12}/></a>}
 <p className="helper">Leave this blank to save the word as “To define.” Personal edits never change the public glossary.</p>
 {draft.context&&<div className="dialog-context"><strong>{context.billTitle}</strong>{draft.context.excerpt||`${context.versionLabel} · ${context.versionDate}`}</div>}
 {error&&<p className="notice notice-error" role="alert">{error}</p>}
 {!account.configured?<p className="notice">Account services are not connected yet. You can explore definitions and prepare a draft, but cloud saving will be available after setup.</p>:(!account.user||requiresAuth)?<><p className="helper">Sign in with Google to save across devices. This draft will be waiting when you return.</p><AuthButton account={{...account,user:null}}/></>:null}
 <div className="dialog-actions"><button className="button button-primary" disabled={busy||!account.configured||!account.user||requiresAuth} type="submit"><BookmarkPlus size={16}/>{busy?"Saving…":"Save to my dictionary"}</button><button className="button button-secondary" type="button" onClick={close} disabled={busy}>Cancel</button></div>
 </form>}</>}
 </dialog></>;
}
