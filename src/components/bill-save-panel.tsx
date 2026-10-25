import Link from 'next/link';
import type {AccountState} from '@/lib/dictionary/types';
import {AuthButton} from './auth-button';
import {SaveBillControls} from './save-bill-controls';
import {getSavedBill} from '@/lib/saved-bills/queries';
export async function BillSavePanel({billId,account,returnPath}:{billId:string;account:AccountState;returnPath:string}){
 const state=account.user?await getSavedBill(billId):null;
 return <div className="sidebar-card"><h2>Keep this bill</h2><p>Bookmark it to read later, or favorite it for quick access. Favorites are also bookmarked. Your lists are private.</p>{state?<SaveBillControls billId={billId} saved={state.saved} favorite={state.favorite} loadError={state.error}/>:<><p>Sign in, then choose Bookmark or Favorite.</p><AuthButton account={account} returnPath={returnPath}/></>}<Link className="text-link" href="/saved">My saved bills →</Link></div>;
}
