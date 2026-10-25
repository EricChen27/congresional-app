import {describe,it,expect} from "vitest";
import {parseVote} from "../src/lib/bills/votes";
import {parseBulkBill} from "../src/lib/bills/normalize";
describe("official voting records",()=>{
 it("retains procedural questions and counts parties separately",()=>{
 const data=parseVote(`<roll_call_vote><vote_question>On the Cloture Motion</vote_question><vote_result>Cloture Motion Agreed to</vote_result><members>${[['D','Yea'],['R','Nay'],['I','Not Voting']].map(([p,v])=>`<member><party>${p}</party><vote_cast>${v}</vote_cast></member>`).join('')}</members></roll_call_vote>`);
 expect(data.question).toBe('On the Cloture Motion');expect(data.parties).toEqual([{party:'Democratic',yes:1,no:0,present:0,notVoting:0},{party:'Independent',yes:0,no:0,present:0,notVoting:1},{party:'Republican',yes:0,no:1,present:0,notVoting:0}]);
 });
 it("reads House official totals, not majority-party inference",()=>{
 const data=parseVote('<rollcall-vote><vote-question>On Passage</vote-question><vote-result>Passed</vote-result><totals-by-party><party>Republican</party><yea-total>209</yea-total><nay-total>2</nay-total><present-total>0</present-total><not-voting-total>7</not-voting-total></totals-by-party></rollcall-vote>');expect(data.parties[0].yes).toBe(209);
 });
 it("does not turn blocked or incomplete responses into zero votes",()=>{expect(()=>parseVote('<html>Unauthorized</html>')).toThrow();expect(()=>parseVote('<rollcall-vote/>')).toThrow();});
 it("preserves official vote references and excludes unsafe ones",()=>{
 const bill=parseBulkBill('<billStatus><bill><congress>119</congress><type>HR</type><number>164</number><actions><item><actionDate>2025-01-15</actionDate><text>Passed House</text><recordedVotes><recordedVote><url>https://clerk.house.gov/evs/2025/roll013.xml</url><chamber>House</chamber><rollNumber>13</rollNumber></recordedVote><recordedVote><url>https://evil.example/vote.xml</url></recordedVote></recordedVotes></item></actions></bill></billStatus>','2026-10-23','https://www.govinfo.gov');expect(bill.actions[0].recordedVotes).toHaveLength(1);expect(bill.actions[0].recordedVotes?.[0].chamber).toBe('House');
 });
});
