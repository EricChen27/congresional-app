import Link from 'next/link';
import { queryCatalog } from '@/lib/bills/catalog-query';
import { BillExplorer } from '@/components/bill-explorer';
import { isModerator } from '@/lib/forum/queries';
export const metadata={title:'Bill forum',description:'Discuss congressional bills, ask questions, and share sourced perspectives.'};
export default async function ForumPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const data=await queryCatalog(await searchParams);
 const moderator=await isModerator();
 return <><header className="page-container page-heading"><div className="eyebrow">READ. QUESTION. DISCUSS.</div><h1>A place for better<br/>civic conversations.</h1><p>Choose a bill, read its sources, and join the conversation. Comments are reviewed before publication.</p>{moderator&&<Link className="button button-secondary" href="/forum/moderation">[Mod] Review comments →</Link>}</header><BillExplorer forum initialData={data}/></>;
}
