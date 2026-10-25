import { load } from "cheerio";
export interface PartyVote { party: string; yes: number; no: number; present: number; notVoting: number }
export interface VoteResult { question: string; result: string; date: string; parties: PartyVote[] }
/** Preserve the official question: procedural votes are not votes on final passage. */
export function parseVote(xml: string): VoteResult {
 const $=load(xml,{xml:true});
 const house=$("rollcall-vote").length>0;
 if(!house&&!$("roll_call_vote").length) throw new Error("Unrecognized vote document");
 const text=(tag:string)=>$(tag).first().text().trim();
 const parties: PartyVote[]=[];
 if(house){
  $("totals-by-party").each((_,node)=>{
   const n=$(node);const count=(tag:string)=>{const raw=n.children(tag).text();if(!/^\d+$/.test(raw))throw new Error("Missing vote total");return Number(raw);};
   parties.push({party:n.children("party").text(),yes:count("yea-total"),no:count("nay-total"),present:count("present-total"),notVoting:count("not-voting-total")});
  });
 }else{
  $("members > member").each((_,node)=>{
   const n=$(node);const code=n.children("party").text();const party=({D:"Democratic",R:"Republican",I:"Independent"} as Record<string,string>)[code]??code;
   let row=parties.find(p=>p.party===party);if(!row){row={party,yes:0,no:0,present:0,notVoting:0};parties.push(row);}
   const vote=n.children("vote_cast").text();if(["Yea","Aye"].includes(vote))row.yes++;else if(["Nay","No"].includes(vote))row.no++;else if(vote==="Present")row.present++;else if(vote==="Not Voting")row.notVoting++;else throw new Error("Unsupported vote category");
  });
 }
 const question=text(house?"vote-question":"vote_question");const result=text(house?"vote-result":"vote_result");
 if(!question||!result||!parties.length)throw new Error("Incomplete vote record");
 return {question,result,date:text(house?"action-date":"vote_date"),parties:parties.sort((a,b)=>a.party.localeCompare(b.party))};
}
