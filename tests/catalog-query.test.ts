import { describe,it,expect,vi } from 'vitest';
vi.mock('server-only',()=>({}));
import { queryCatalog } from '@/lib/bills/catalog-query';
import { GET } from '@/app/api/bills/route';
import { listBills,searchBills } from '@/lib/bills';
describe('server-side catalog boundary',()=>{
 it('returns only 18 compact records without documents, timelines or full summaries',async()=>{
 const result=await queryCatalog({});expect(result.bills).toHaveLength(18);expect(result.total).toBe((await listBills()).length);
 for(const b of result.bills){expect(b).not.toHaveProperty('textVersions');expect(b).not.toHaveProperty('actions');expect(b.summaries.length).toBeLessThanOrEqual(1);expect(b.summaries[0]?.text.length||0).toBeLessThanOrEqual(400);}
 });
 it('filters and sorts all records before pagination',async()=>{const params={chamber:'senate',summary:'without',sort:'title'};const expected=searchBills(await listBills(),params);const result=await queryCatalog({...params,page:'2'});expect(result.total).toBe(expected.length);expect(result.bills.map(b=>b.id)).toEqual(expected.slice((result.page-1)*18,result.page*18).map(b=>b.id));});
 it('clamps malformed and oversized pages and reports missing exact bills across Congresses',async()=>{expect((await queryCatalog({page:'NaN'})).page).toBe(1);const last=await queryCatalog({page:'999999'});expect(last.page).toBe(last.pages);expect((await queryCatalog({q:'118 H.R. 164'})).missingExact).toEqual({congress:118,type:'hr',number:'164'});expect((await queryCatalog({q:'H.R. 164',summary:'without'})).missingExact).toBeNull();});
 it('serves the same bounded result through the public API',async()=>{const response=await GET(new Request('http://localhost/api/bills?chamber=house&page=2'));expect(response.status).toBe(200);const result=await response.json();expect(result.page).toBe(2);expect(result.bills).toHaveLength(18);expect(result.bills.every((b:{billType:string})=>b.billType==='hr')).toBe(true);});
});

it('applies voting status before pagination and combines it with other filters',async()=>{
 const voted=await queryCatalog({voting:'voted'});const pending=await queryCatalog({voting:'not-voted'});
 expect(voted.total).toBeGreaterThan(0);expect(pending.total).toBeGreaterThan(0);expect(voted.total+pending.total).toBe((await listBills()).length);
 expect((await queryCatalog({q:'H.R. 164',voting:'voted'})).total).toBe(1);
 expect((await queryCatalog({q:'H.R. 164',voting:'not-voted'})).total).toBe(0);
 const response=await GET(new Request('http://localhost/api/bills?voting=voted&chamber=senate'));
 const result=await response.json();expect(result.filters.voting).toBe('voted');expect(result.bills.every((b:{billType:string})=>b.billType==='s')).toBe(true);
});

it('filters by introduction year across the full catalog and combines with other filters',async()=>{
 const bills=await listBills();
 const oldest=await queryCatalog({sort:'introduced-oldest'});expect(oldest.bills[0].introducedDate).toBe([...bills].sort((a,b)=>a.introducedDate.localeCompare(b.introducedDate))[0].introducedDate);
 for(const year of ['2025','2026']){
  const result=await queryCatalog({year,chamber:'house',sort:'introduced'});
  expect(result.total).toBe(bills.filter(b=>b.billType==='hr'&&b.introducedDate.startsWith(year+'-')).length);
  expect(result.bills.every(b=>b.introducedDate.startsWith(year+'-'))).toBe(true);
 }
 const response=await GET(new Request('http://localhost/api/bills?year=2025&voting=voted'));
 const result=await response.json();expect(result.filters.year).toBe('2025');expect(result.bills.every((b:{introducedDate:string})=>b.introducedDate.startsWith('2025-'))).toBe(true);
 expect((await queryCatalog({year:'bad'})).total).toBe(bills.length);
});
