import 'server-only';
import {createClient} from '@/lib/supabase/server';
export async function getSavedBill(billId:string){
 try{
  const client=await createClient();if(!client)throw new Error();
  const {data:auth,error:authError}=await client.auth.getUser();if(authError||!auth.user)throw new Error();
  const {data,error}=await client.from('saved_bills').select('favorite').eq('owner_id',auth.user.id).eq('bill_id',billId).maybeSingle();
  if(error)throw new Error();return {saved:!!data,favorite:!!data?.favorite,error:''};
 }catch{return {saved:false,favorite:false,error:'Saved bills could not be loaded. Retry after checking the connection or applying the saved-bills database update.'};}
}
export async function getSavedBills(favorites:boolean,page:number){
 try{
  const client=await createClient();if(!client)throw new Error();
  const {data:auth,error:authError}=await client.auth.getUser();if(authError||!auth.user)throw new Error();
  let query=client.from('saved_bills').select('bill_id,title,favorite,created_at',{count:'exact'}).eq('owner_id',auth.user.id);
  if(favorites)query=query.eq('favorite',true);
  const {data,error,count}=await query.order('created_at',{ascending:false}).order('bill_id').range((page-1)*30,page*30-1);
  if(error)throw new Error();return {entries:data??[],total:count??0,error:''};
 }catch{return {entries:[],total:0,error:'Saved bills are unavailable. If this feature was just added, run the saved-bills database update, then reload.'};}
}
