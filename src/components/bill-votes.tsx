import type { Bill } from "@/lib/bills/types";
import { fetchOfficialText } from "@/lib/bills/content";
import { parseVote, type VoteResult } from "@/lib/bills/votes";
const cache=new Map<string,{expires:number;data:VoteResult}>();
async function getVote(url:string){
 const hit=cache.get(url);if(hit&&hit.expires>Date.now())return hit.data;
 const data=parseVote(await fetchOfficialText(url.replace(/\.htm[l]?$/,".xml")));
 if(cache.size>=200)cache.delete(cache.keys().next().value!);
 cache.set(url,{expires:Date.now()+3600000,data});return data;
}
export async function BillVotes({bill}:{bill:Bill}){
 const seen=new Set<string>();
 const votes=bill.actions.flatMap(a=>(a.recordedVotes??[]).map(v=>({...v,action:a.text}))).filter(v=>{if(seen.has(v.url))return false;seen.add(v.url);return true;});
 // Limit simultaneous source requests; every remaining roll call still has its official link.
 const results=await Promise.all(votes.slice(0,8).map(async v=>{try{return await getVote(v.url);}catch{return null;}}));
 const unrecorded=bill.actions.filter(a=>/voice vote|unanimous consent/i.test(a.text));
 return <div className="vote-section"><p>Latest documented action: <strong>{bill.latestAction.text}</strong></p><p className="muted">Passing one chamber does not make a bill law. Each vote below concerns the exact motion shown; amendments and procedural votes do not necessarily indicate support for final passage. Party affiliation is taken from the vote record, including independents separately.</p>
 {!votes.length&&<div className="notice">No recorded roll-call links are available in this bill snapshot. This does not mean nobody voted. Check the timeline and official actions for other decisions.</div>}
 {votes.map((vote,i)=>{const data=results[i];return <article className="vote-card" key={vote.url}><div className="eyebrow">{vote.chamber} · Roll call {vote.rollNumber} · {vote.date.slice(0,10)}</div><h3>{data?.question??"Recorded vote"}</h3><p>{vote.action}</p>{data?<><p><strong>Official result: {data.result}</strong></p><div className="vote-table-wrap"><table><caption>Votes by party · {data.date}</caption><thead><tr><th scope="col">Party</th><th scope="col">Yes</th><th scope="col">No</th><th scope="col">Present</th><th scope="col">Not voting</th></tr></thead><tbody>{data.parties.map(row=><tr key={row.party}><th scope="row">{row.party}</th><td>{row.yes}</td><td>{row.no}</td><td>{row.present}</td><td>{row.notVoting}</td></tr>)}</tbody></table></div></>:<p className="muted">{i>=8?"Open the official record for this vote’s totals.":"Party totals could not be loaded from the official source. No totals have been estimated."}</p>}<a className="text-link" href={vote.url} target="_blank" rel="noreferrer">Official vote and individual members’ votes ↗</a></article>;})}
 {unrecorded.length>0&&<section><h3>Decisions without a recorded roll call</h3><p>Voice votes and unanimous consent do not provide individual or party vote totals. Unanimous consent means no objection was recorded, not that every member cast a yes vote.</p>{unrecorded.map((a,i)=><p key={i}><strong>{a.date}</strong> — {a.text}</p>)}</section>}
 <a className="text-link" href={`${bill.officialUrl}/all-actions`} target="_blank" rel="noreferrer">All official legislative actions ↗</a></div>;
}
