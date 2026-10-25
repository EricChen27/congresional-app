import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBill,billLabel } from '@/lib/bills';
import { getAccountState } from '@/lib/supabase/account';
import { getForumComments, isModerator } from '@/lib/forum/queries';
import { ForumThread } from '@/components/forum-thread';
export const dynamic='force-dynamic';
export const metadata={title:'Bill discussion'};
export default async function DiscussionPage({params,searchParams}:{params:Promise<{congress:string;type:string;number:string}>;searchParams:Promise<{page?:string}>}){
 const p=await params;const q=await searchParams;
 if(!/^\d{2,3}$/.test(p.congress)||!['hr','s'].includes(p.type)||!/^[1-9]\d{0,5}$/.test(p.number))notFound();
 const bill=await getBill(p.congress,p.type,p.number);
 if(!bill)return <div className="page-container page-heading"><h1>This bill couldn’t be loaded.</h1><p>Check its number or try again later.</p><Link className="text-link" href="/forum">Back to forum</Link></div>;
 const page=Math.max(1,Math.min(2000,Number.parseInt(q.page||'1',10)||1));
 const moderator=await isModerator();
 const account=await getAccountState();const data=await getForumComments(bill.id,page);const base=`/forum/${p.congress}/${p.type}/${p.number}`;
 return <div className="page-container forum-thread-page"><header className="page-heading"><Link className="text-link" href="/forum">← All discussions</Link><div className="eyebrow">{billLabel(bill)} · {bill.congress}th Congress</div><h1>{bill.title}</h1><Link className="button button-secondary" href={`/bills/${p.congress}/${p.type}/${p.number}`}>Read the bill and official sources →</Link>{moderator&&<Link className="button button-secondary" href="/forum/moderation">[Mod] Review comments →</Link>}</header><ForumThread versions={bill.textVersions.map(({id,type,date,url})=>({id,type,date,url}))} account={account} billId={bill.id} comments={data.comments} error={data.error}/><nav className="pagination" aria-label="Comment pages">{page>1&&<Link href={`${base}?page=${page-1}`} className="button button-secondary">Newer comments</Link>}<span>Page {page}</span>{data.hasMore&&<Link href={`${base}?page=${page+1}`} className="button button-secondary">Older comments</Link>}</nav></div>;
}
