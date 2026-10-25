import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { ForumComment, ModerationComment } from './types';
export async function getForumComments(billId:string,page:number):Promise<{comments:ForumComment[];hasMore:boolean;error?:string}>{
 try{
  const client=await createClient();
  if(!client)return {comments:[],hasMore:false,error:'Discussions are not connected yet. Posting will open after account and moderator setup.'};
  const {data,error}=await client.rpc('forum_username_page',{p_bill:billId,p_page:page});
  if(error)return {comments:[],hasMore:false,error:error.code==='PGRST202'?'Threaded discussions need the latest database update. Apply the latest forum and username migrations, then reload.':'Discussions could not be loaded. Please try again later.'};
  return {comments:data.comments as ForumComment[],hasMore:data.hasMore===true};
 }catch{return {comments:[],hasMore:false,error:'Discussion services are temporarily unavailable.'};}
}
export async function getModerationQueue():Promise<{comments:ModerationComment[];allowed:boolean;error?:string}>{
 try{
  const client=await createClient();if(!client)return {comments:[],allowed:false,error:'Connect Supabase and assign a moderator to enable moderation.'};
  const {data:account,error:authError}=await client.auth.getUser();
  if(authError||!account.user)return {comments:[],allowed:false,error:'Sign in with a moderator account.'};
  const {data:allowed,error:roleError}=await client.rpc('forum_is_moderator');
  if(roleError||!allowed)return {comments:[],allowed:false,error:'This page is available only to assigned moderators.'};
  const {data,error}=await client.rpc('forum_thread_moderation_queue');
  return error?{comments:[],allowed:true,error:'The queue could not be loaded. Please reload.'}:{comments:data as ModerationComment[],allowed:true};
 }catch{return {comments:[],allowed:false,error:'Moderation services are temporarily unavailable.'};}
}

export async function isModerator():Promise<boolean>{
 try {const client=await createClient();if(!client)return false;const {data:{user}}=await client.auth.getUser();if(!user)return false;const {data,error}=await client.rpc('forum_is_moderator');return !error&&data===true;}catch{return false;}
}
