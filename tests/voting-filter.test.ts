import {expect,it} from 'vitest';
import {hasDocumentedVote} from '../src/lib/bills/search';
const check=(text:string)=>hasDocumentedVote({actions:[{date:'2026-01-01',text}]});
it('includes voice votes, recorded votes, and passage without a roll call',()=>{
 expect(check('Ordered to be Reported by Voice Vote.')).toBe(true);
 expect(check('Passed Senate without amendment by Unanimous Consent.')).toBe(true);
 expect(check('On motion to suspend the rules and pass the bill Failed by the Yeas and Nays: 200 - 220.')).toBe(true);
 expect(hasDocumentedVote({actions:[{date:'2026-01-01',text:'On the cloture motion',recordedVotes:[{url:'https://www.senate.gov/vote.xml',chamber:'Senate',date:'2026-01-01',rollNumber:'1'}]}]})).toBe(true);
});
it('does not mistake scheduled votes, referrals or consent requests for completed votes',()=>{
 for(const text of ['Referred to committee.','Vote scheduled for tomorrow.','Motion to pass the bill made.','Unanimous consent requested.','Senate Committee discharged by Unanimous Consent.'])expect(check(text)).toBe(false);
 expect(hasDocumentedVote({actions:[]})).toBe(false);
});
