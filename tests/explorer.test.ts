vi.mock("server-only",()=>({}));
import {describe,it,expect,vi} from 'vitest';
import {pageWindow} from '@/lib/pagination';
import {searchBills} from '@/lib/bills/search';
import {listBills} from '@/lib/bills';
import {findGlossaryTerm,splitGlossaryText} from '@/lib/glossary';
describe('expanded civic learning and browsing',()=>{
 it('centers five pages and keeps both ends reachable',()=>{expect(pageWindow(7,14)).toEqual([5,6,7,8,9]);expect(pageWindow(1,14)).toEqual([1,2,3,4,5]);expect(pageWindow(14,14)).toEqual([10,11,12,13,14]);expect(pageWindow(1,2)).toEqual([1,2]);});
 it('separates bills by available official summary and sorts either group first',async()=>{const bills=await listBills();const withSummary=searchBills(bills,{summary:'with'});const without=searchBills(bills,{summary:'without'});expect(withSummary.length+without.length).toBe(bills.length);expect(withSummary.every(b=>b.summaries.some(s=>s.text.trim()))).toBe(true);expect(without.every(b=>!b.summaries.some(s=>s.text.trim()))).toBe(true);expect(searchBills(bills,{sort:'summary-first'})[0].summaries.length).toBeGreaterThan(0);expect(searchBills(bills,{sort:'no-summary-first'})[0].summaries).toHaveLength(0);expect(searchBills(bills,{query:'H.R. 164',summary:'without'})).toHaveLength(0);});
 it('recognizes agencies and multiword programs in bill text',()=>{for(const [word,id] of [['HHS','hhs'],['FDA','fda'],['DOE','doe'],['social security','social-security'],['Medicare','medicare'],['House of Representatives','house-of-representatives']])expect(findGlossaryTerm(word)?.id).toBe(id);expect(findGlossaryTerm('ED')).toBeUndefined();expect(splitGlossaryText('Medicare and Social Security').filter(p=>p.term).map(p=>p.term?.id)).toEqual(['medicare','social-security']);});
});
