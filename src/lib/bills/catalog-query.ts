import 'server-only';
import { listBills, getCatalogInfo } from './index';
import { searchBills, parseBillQuery, getDefaultSummary } from './search';
import type { Bill } from './types';
export type CatalogParams=Record<string,string|string[]|undefined>;
export async function queryCatalog(params:CatalogParams){
 const read=(key:string,max=200)=>typeof params[key]==='string'?(params[key] as string).slice(0,max):'';
 const filters={query:read('q'),category:read('category'),chamber:read('chamber'),summary:read('summary'),voting:read('voting'),year:read('year',4),sort:read('sort')};
 const bills=await listBills();const filtered=searchBills(bills,filters);const pages=Math.max(1,Math.ceil(filtered.length/18));
 const requested=Number(read('page',12));const page=Math.min(pages,Number.isFinite(requested)?Math.max(1,Math.floor(requested)):1);
 const exact=parseBillQuery(filters.query);const missingExact=exact&&!bills.some(b=>b.congress===exact.congress&&b.billType===exact.type&&b.number===exact.number)?exact:null;
 return {bills:filtered.slice((page-1)*18,page*18).map(toCard),total:filtered.length,page,pages,filters,missingExact,categories:[...new Set(bills.map(b=>b.category))].sort(),info:getCatalogInfo()};
}
// Explicit public projection: full documents, summary versions, and timelines
// never cross the catalog boundary. Search still uses the complete server data.
function toCard(b:Bill){
 const summary=getDefaultSummary(b);
 return {id:b.id,congress:b.congress,billType:b.billType,number:b.number,title:b.title,category:b.category,introducedDate:b.introducedDate,latestAction:{date:b.latestAction.date,text:b.latestAction.text.slice(0,400)},summaries:summary?[{...summary,text:summary.text.slice(0,400)}]:[]};
}
export type CatalogPage=Awaited<ReturnType<typeof queryCatalog>>;
