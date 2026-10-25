import { queryCatalog } from '@/lib/bills/catalog-query';
export async function GET(request:Request){
 try{return Response.json(await queryCatalog(Object.fromEntries(new URL(request.url).searchParams)),{headers:{'Cache-Control':'no-store'}});}
 catch{return Response.json({error:'Bill search is temporarily unavailable.'},{status:503});}
}
