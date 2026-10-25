import { queryCatalog } from "@/lib/bills/catalog-query";
import { BillExplorer } from "@/components/bill-explorer";
export const metadata={title:"Explore bills"};
type Params=Record<string,string|string[]|undefined>;
export default async function BillsPage({searchParams}:{searchParams:Promise<Params>}){
 const params=await searchParams;
 return <BillExplorer initialData={await queryCatalog(params)}/>;
}
