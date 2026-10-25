vi.mock("server-only",()=>({}));
import { afterEach, describe, expect, it, vi } from "vitest";
import { listBills, getCatalogInfo, getBill, getBillText, getDefaultSummary, parseBillQuery, searchBills } from "@/lib/bills";
import { officialMarkupToText, assertOfficialUrl, fetchOfficialText } from "@/lib/bills/content";
import { normalizeBill, parseBulkBill } from "@/lib/bills/normalize";
import { fetchApiCollection } from "@/lib/bills/fetch";

afterEach(()=>vi.unstubAllGlobals());
describe("official bill discovery and source versions",()=>{
 it("reads direct bill metadata rather than a related bill's latest action",()=>{
  const xml='<billStatus><bill><congress>119</congress><type>HR</type><number>1</number><title>Main bill</title><relatedBills><item><latestAction><actionDate>2025-08-01</actionDate><text>Related bill action</text></latestAction></item></relatedBills><latestAction><actionDate>2025-09-01</actionDate><text>Actual bill action</text></latestAction><actions><item><actionDate>2025-09-01</actionDate><text>Actual bill action</text></item></actions></bill></billStatus>';
  expect(parseBulkBill(xml,"2026-10-22","https://www.govinfo.gov/").latestAction).toEqual({date:"2025-09-01",text:"Actual bill action"});
 });
 it("ships the full indexed catalog of unique real records with dated sources and readable featured bills",async()=>{
  const bills=await listBills();expect(bills.length).toBeGreaterThan(2000);expect(bills).toHaveLength(getCatalogInfo().targetCount);expect(new Set(bills.map(b=>b.id)).size).toBe(bills.length);
  for(const bill of bills){expect(bill.retrievedAt).toMatch(/^2026-/);expect(()=>assertOfficialUrl(bill.officialUrl)).not.toThrow();}
  const featured=bills.filter(b=>b.featured);expect(featured).toHaveLength(3);
  for(const bill of featured){expect(bill.summaries.length).toBeGreaterThan(0);const text=await getBillText(bill);expect(text.text?.length).toBeGreaterThan(100);expect(text.version?.id).toBeTruthy();}
 });
 it("parses number formats and keeps Congress identity explicit",()=>{
  expect(parseBillQuery("H.R. 164")).toEqual({congress:119,type:"hr",number:"164"});
  expect(parseBillQuery("118 HR 1")).toEqual({congress:118,type:"hr",number:"1"});
  expect(parseBillQuery("S.146")).toEqual({congress:119,type:"s",number:"146"});
  expect(parseBillQuery("HR 0")).toBeNull();expect(parseBillQuery("education")).toBeNull();
 });
 it("combines query, policy, and chamber filters without cross-Congress matches",async()=>{
  const bills=await listBills();const bill=bills.find(b=>b.id==="119-hr-164")!;
  expect(searchBills(bills,{query:"POWER",category:bill.category,chamber:"house"}).some(b=>b.id===bill.id)).toBe(true);
  expect(searchBills(bills,{query:"H.R. 164",chamber:"senate"})).toHaveLength(0);
  expect(searchBills(bills,{query:"118 HR 164"})).toHaveLength(0);
  expect(searchBills(bills,{query:"word_that_is_not_in_any_bill"})).toHaveLength(0);
 });
 it("chooses legislative stage before a later publication update",()=>{
  const summary=(id:string,actionDate:string,updatedAt:string)=>({id,actionDate,updatedAt,text:"Summary",versionLabel:"Stage",sourceUrl:"https://www.congress.gov/"});
  expect(getDefaultSummary({summaries:[summary("older","2025-01-01","2026-01-01"),summary("newer","2025-02-01","2025-03-01")]} )?.id).toBe("newer");
  expect(getDefaultSummary({summaries:[]})).toBeNull();
 });
 it("keeps unavailable or PDF-only text honest",async()=>{
  const bill=(await listBills())[0];
  expect((await getBillText({...bill,textVersions:[]})).text).toBeNull();
  expect((await getBillText({...bill,textVersions:[{id:"pdf",type:"Official text",date:"2025-01-01",url:"https://www.govinfo.gov/example.pdf",format:"pdf"}]})).error).toContain("PDF");
  expect((await getBillText(bill,"no-such-version")).error).toContain("not found");
 });
 it("extracts text without scripts, style, or active HTML",()=>{
  expect(officialMarkupToText('<head><style>bad</style></head><p>A <b>bill</b> &amp; amendment.</p><script>alert(1)</script>')).toBe("A bill & amendment.");
  expect(officialMarkupToText('<pre>SECTION 1.\n  Official words.</pre><script>attack</script>')).toBe("SECTION 1.\n  Official words.");
 });
 it("rejects unsafe source destinations including redirected internal hosts",async()=>{
  for(const url of ["http://www.govinfo.gov/a","https://www.govinfo.gov.evil.test/a","https://user@www.govinfo.gov/a","https://www.govinfo.gov:444/a"])expect(()=>assertOfficialUrl(url)).toThrow();
  vi.stubGlobal("fetch",vi.fn().mockResolvedValue(new Response(null,{status:302,headers:{location:"http://127.0.0.1/private"}})));
  await expect(fetchOfficialText("https://www.govinfo.gov/a")).rejects.toThrow();
 });
 it("follows all API action pages without carrying credentials in URLs",async()=>{
  const mock=vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({actions:[{text:"One"}],pagination:{next:"https://api.congress.gov/v3/bill/119/hr/1/actions?offset=250&api_key=secret"}}))).mockResolvedValueOnce(new Response(JSON.stringify({actions:[{text:"Two"}],pagination:{}})));
  vi.stubGlobal("fetch",mock);
  expect(await fetchApiCollection("https://api.congress.gov/v3/bill/119/hr/1/actions","secret","actions")).toEqual([{text:"One"},{text:"Two"}]);
  for(const call of mock.mock.calls)expect(String(call[0])).not.toContain("secret");
 });
 it("returns no fabricated bill on a failed official lookup",async()=>{
  vi.stubGlobal("fetch",vi.fn().mockRejectedValue(new Error("Offline")));
  expect(await getBill(119,"hr","99999")).toBeNull();
 });
 it("deduplicates actions and filters unsafe official formats",()=>{
  const bill=normalizeBill({number:"1",congress:119,type:"HR",title:"Test fixture"},{summaries:[],actions:[{actionDate:"2025-01-01",text:"Introduced"},{actionDate:"2025-01-01",text:"Introduced"}],textVersions:[{type:"Text",date:"2025-01-01",formats:[{url:"https://evil.test/text",type:"HTML"}]}]},"2026-10-22","https://www.congress.gov/");
  expect(bill.actions).toHaveLength(1);expect(bill.textVersions).toHaveLength(0);
 });
});

it('selects undated enrolled text instead of silently showing an older version',async()=>{
 const bill=(await listBills()).find(b=>b.id==='119-hr-164')!;
 const older={id:'older',type:'Introduced in House',date:'2025-01-01',url:'https://www.govinfo.gov/older.xml',text:'Older text'};
 const enrolled={id:'enrolled',type:'Enrolled Bill',date:'',url:'https://www.govinfo.gov/enrolled.xml'};
 vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('Unavailable')));
 const result=await getBillText({...bill,textVersions:[older,enrolled]});
 expect(result.version?.id).toBe('enrolled');expect(result.text).toBeNull();expect(result.error).toContain('unavailable');
 expect((await getBillText({...bill,textVersions:[older,enrolled]},'older')).text).toBe('Older text');
});
