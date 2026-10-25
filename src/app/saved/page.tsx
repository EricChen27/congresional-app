import Link from 'next/link';
import {getAccountState} from '@/lib/supabase/account';
import {getSavedBills} from '@/lib/saved-bills/queries';
import {AuthButton} from '@/components/auth-button';
import {SaveBillControls} from '@/components/save-bill-controls';
import {formatDate} from '@/components/bill-card';
export const dynamic='force-dynamic';
export const revalidate=0;
export const metadata={title:'Saved bills',robots:{index:false,follow:false}};
export default async function SavedPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const q=await searchParams;const favorites=q.view==='favorites';const parsed=Number(q.page);const page=Number.isSafeInteger(parsed)&&parsed>0?Math.min(parsed,100000):1;
 const account=await getAccountState();const data=account.user?await getSavedBills(favorites,page):null;
 const href=(p:number)=>`/saved?${favorites?'view=favorites&':''}page=${p}`;
 return <div className="page-container"><header className="page-heading"><div className="eyebrow">YOUR LEGISLATION READING LIST</div><h1>Saved bills</h1><p>Private to your account · Bookmarks and favorites stay with you across devices.</p></header>{!account.user?<section className="card empty-state"><h2>Keep the bills you care about.</h2><p>Sign in to bookmark bills and mark your favorites.</p><AuthButton account={account} returnPath="/saved"/></section>:<><nav className="saved-bill-buttons" aria-label="Saved bill lists"><Link className="button button-secondary" href="/saved" aria-current={!favorites?'page':undefined}>All bookmarks</Link><Link className="button button-secondary" href="/saved?view=favorites" aria-current={favorites?'page':undefined}>Favorites</Link></nav>{data?.error?<p className="notice" role="alert">{data.error} <Link href={href(page)}>Try again</Link></p>:<><p>{data?.total??0} {favorites?'favorite':'bookmarked'} bills</p>{!data?.entries.length?<section className="card empty-state"><h2>{page>1?'No saved bills on this page.':favorites?'No favorites yet.':'No bookmarks yet.'}</h2><p>Open a bill and use the Bookmark or Favorite button to add it here.</p><Link className="text-link" href={page>1?href(1):'/bills'}>{page>1?'Back to first page':'Explore bills →'}</Link></section>:<div className="bill-grid">{data.entries.map(b=>{const [congress,type,number]=b.bill_id.split('-');return <article className="card learn-card" key={b.bill_id}><div className="eyebrow">{type==='hr'?'H.R.':'S.'} {number} · {congress}th Congress</div><h2><Link href={`/bills/${congress}/${type}/${number}`}>{b.title}</Link></h2><p>Saved {formatDate(b.created_at)}</p><SaveBillControls billId={b.bill_id} saved favorite={b.favorite}/></article>;})}</div>}{(page>1||(data?.total??0)>page*30)&&<nav className="pagination" aria-label="Saved bills pages">{page>1&&<Link href={href(page-1)}>Previous</Link>}<span>Page {page}</span>{(data?.total??0)>page*30&&<Link href={href(page+1)}>Next</Link>}</nav>}</>}</>}</div>;
}
