"use server";
import {revalidatePath} from 'next/cache';
import {createClient} from '@/lib/supabase/server';
import {getBill} from '@/lib/bills';
export async function setSavedBill(billId:string, saved:boolean, favorite:boolean){
 if(typeof billId!=='string'||!/^\d{2,3}-(hr|s)-[1-9]\d{0,5}$/.test(billId)||typeof saved!=='boolean'||typeof favorite!=='boolean'||(!saved&&favorite))return {ok:false,error:'Invalid saved bill request.'};
 try{
  const client=await createClient();if(!client)return {ok:false,error:'Account services are unavailable. Nothing was changed.'};
  const {data:auth,error:authError}=await client.auth.getUser();if(authError||!auth.user)return {ok:false,error:'Sign in again to save this bill.',requiresAuth:true};
  if(saved){
   const [congress,type,number]=billId.split('-');const bill=await getBill(congress,type,number);
   if(!bill)return {ok:false,error:'The bill could not be verified. Please try again.'};
   const {data,error}=await client.from('saved_bills').upsert({owner_id:auth.user.id,bill_id:billId,title:bill.title.slice(0,2000),favorite},{onConflict:'owner_id,bill_id'}).select('bill_id').single();
   if(error||!data)return {ok:false,error:'Your bill was not saved. Please try again. If this feature was just added, apply the saved-bills database update first.'};
  }else{
   const {error}=await client.from('saved_bills').delete().eq('owner_id',auth.user.id).eq('bill_id',billId);
   if(error)return {ok:false,error:'The bill could not be removed. Please try again.'};
  }
  revalidatePath('/saved');revalidatePath(`/bills/${billId.replaceAll('-','/')}`);
  return {ok:true,saved,favorite};
 }catch{return {ok:false,error:'The save service is unavailable. Nothing was confirmed saved.'};}
}
