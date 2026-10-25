'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getBill } from '@/lib/bills';
import type { ForumResult } from './types';
const billSchema=z.string().regex(/^\d{2,3}-(hr|s)-[1-9]\d{0,5}$/);
const bodySchema=z.string().trim().min(10).max(3000).refine(value=>!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(value));
const knownErrors=['Reply target is no longer available.','This thread has reached its reply depth limit.','Please wait one minute between comments.','Daily limit reached. Please try tomorrow.','Daily report limit reached.','Posting opens when a moderator is assigned.','Moderator access required.','Comment unavailable or not yours.','This comment cannot be reported.','Verify your account before posting.','Comment no longer available.'];
async function mutate(rpc:string,args:Record<string,unknown>):Promise<ForumResult>{
 try {
  const client=await createClient(); if(!client)return {ok:false,error:'Discussion services are not connected yet.'};
  const {data,error}=await client.auth.getUser();
  if(error||!data.user)return {ok:false,error:'Sign in again to continue. Your comment is still here.'};
  const result=await client.rpc(rpc,args);
  if(result.error)return {ok:false,error:knownErrors.includes(result.error.message)?result.error.message:'Your change was not saved. Please try again.'};
  revalidatePath('/forum','layout');revalidatePath('/profile','layout');revalidatePath('/users','layout');return {ok:true};
 }catch{return {ok:false,error:'Discussion services are unavailable. Your change was not saved.'};}
}
export async function postForumComment(billId:string,body:string,accepted:boolean,parentId:string|null=null,reference?:{versionId:string;location:string;quote:string}):Promise<ForumResult>{
 const bill=billSchema.safeParse(billId);const comment=bodySchema.safeParse(body);
 if(!bill.success||!comment.success||accepted!==true)return {ok:false,error:'Write 10–3,000 characters and agree to the discussion rules.'};
 const [congress,type,number]=bill.data.split('-');
 const document=await getBill(congress,type,number);
 if(!document)return {ok:false,error:'This bill could not be verified. Please try again.'};
 if(parentId!==null&&!z.uuid().safeParse(parentId).success)return {ok:false,error:'Invalid reply target.'};
 let citation=null;
 if(reference){
  const checked=z.object({versionId:z.string().max(200),location:z.string().trim().max(200),quote:z.string().trim().max(1500)}).safeParse(reference);
  if(!checked.success)return {ok:false,error:'Check the reference length.'};
  const version=document.textVersions.find(v=>v.id===checked.data.versionId);
  if(!version)return {ok:false,error:'Choose an available bill text version.'};
  citation={version:`${version.type} · ${version.date}`,url:version.url,location:checked.data.location,quote:checked.data.quote};
 }
 return mutate('forum_post_reply',{p_bill:bill.data,p_body:comment.data,p_parent:parentId,p_reference:citation});
}
export async function removeForumComment(id:string):Promise<ForumResult>{
 if(!z.uuid().safeParse(id).success)return {ok:false,error:'Invalid comment.'};
 return mutate('forum_remove_comment',{p_id:id});
}
export async function reportForumComment(id:string,reason:string):Promise<ForumResult>{
 if(!z.uuid().safeParse(id).success||!z.enum(['harassment','spam','personal-information','other']).safeParse(reason).success)return {ok:false,error:'Choose a report reason.'};
 return mutate('forum_report_comment',{p_id:id,p_reason:reason});
}
export async function moderateForumComment(id:string,decision:string):Promise<ForumResult>{
 if(!z.uuid().safeParse(id).success||!z.enum(['published','hidden']).safeParse(decision).success)return {ok:false,error:'Invalid moderation decision.'};
 return mutate('forum_moderate_comment',{p_id:id,p_decision:decision});
}
