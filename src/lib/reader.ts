import type { DictionaryContext, DictionaryDraft } from "@/lib/dictionary/types";
import { findGlossaryTerm } from "@/lib/glossary";
import { dictionaryDraftSchema } from "@/lib/dictionary/validation";
export const DRAFT_KEY="billbreakdown:dictionary-draft:v1";
export function makeDictionaryDraft(term:string,context?:DictionaryContext):DictionaryDraft{
 const trimmed=term.trim().replace(/\s+/g," ");const match=findGlossaryTerm(trimmed);
 return {term:trimmed,definition:match?.definition||"",definitionOrigin:match?"curated":"unset",glossaryId:match?.id,definitionSourceUrl:match?.sourceUrl,context};
}
export function extractSelectionContext(container:HTMLElement,selection:Selection|null):{term:string;excerpt:string}|null{
 if(!selection||selection.rangeCount===0||selection.isCollapsed)return null;
 const range=selection.getRangeAt(0);
 if(!container.contains(range.startContainer)||!container.contains(range.endContainer))return null;
 const term=selection.toString().trim().replace(/\s+/g," ");
 if(!term||term.length>100||term.split(/\s+/).length>12)return null;
 const before=range.cloneRange();before.selectNodeContents(container);before.setEnd(range.startContainer,range.startOffset);
 const start=before.toString().length;const text=container.textContent||"";
 const excerpt=text.slice(Math.max(0,start-150),start+range.toString().length+150).trim();
 return {term,excerpt};
}
export function parseStoredDraft(raw:string|null,path:string,now=Date.now()):DictionaryDraft|null{
 if(!raw)return null;
 try{const value=JSON.parse(raw);if(value.path!==path||typeof value.expires!=="number"||value.expires<now)return null;const parsed=dictionaryDraftSchema.safeParse(value.draft);return parsed.success?parsed.data:null;}catch{return null;}
}
