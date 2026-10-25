"use client";
import {useState,useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {Bookmark,Star} from 'lucide-react';
import {setSavedBill} from '@/lib/saved-bills/actions';
export function SaveBillControls({billId,saved,favorite,loadError=''}:{billId:string;saved:boolean;favorite:boolean;loadError?:string}){
 const [busy,startTransition]=useTransition();const [error,setError]=useState('');const [notice,setNotice]=useState('');const router=useRouter();
 function change(nextSaved:boolean,nextFavorite:boolean){setError('');setNotice('');startTransition(async()=>{
  try{const result=await setSavedBill(billId,nextSaved,nextFavorite);if(!result.ok){setError(result.error??'Please try again.');return;}setNotice(nextFavorite?'Added to favorites.':nextSaved?'Bookmarked.':'Removed from saved bills.');router.refresh();}
  catch{setError('The change could not be confirmed. Please try again.');}
 });}
 return <div className="saved-bill-controls"><div className="saved-bill-buttons"><button type="button" className="button button-secondary" disabled={busy||!!loadError} aria-pressed={saved} onClick={()=>change(!saved,false)}><Bookmark size={16} fill={saved?'currentColor':'none'}/>{saved?'Remove bookmark':'Bookmark'}</button><button type="button" className="button button-secondary" disabled={busy||!!loadError} aria-pressed={favorite} onClick={()=>change(true,!favorite)}><Star size={16} fill={favorite?'currentColor':'none'}/>{favorite?'Unfavorite':'Favorite'}</button></div>{favorite&&<p className="muted">Removing the bookmark also removes it from favorites.</p>}{busy&&<p role="status">Saving…</p>}{notice&&<p role="status">{notice}</p>}{(error||loadError)&&<p role="alert">{error||loadError} <button className="plain-button text-link" onClick={()=>router.refresh()}>Reload</button></p>}</div>;
}
