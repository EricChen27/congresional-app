'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
const schema=z.object({username:z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,40}$/),display_name:z.string().trim().min(2).max(50),bio:z.string().trim().max(500),avatar:z.string().max(200000).refine(v=>v===''||/^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/=]+$/.test(v)),show_comments:z.boolean()});
export async function saveProfile(input:unknown):Promise<{ok:boolean;id?:string;username?:string;error?:string}>{
 const parsed=schema.safeParse(input);if(!parsed.success)return {ok:false,error:'Use a username of 3–40 letters, numbers, or underscores, a display name of 2–50 characters, a bio up to 500 characters, and a valid photo.'};
 try{
 const client=await createClient();if(!client)return {ok:false,error:'Accounts are unavailable. Your draft has not been saved.'};
 const {data:{user},error}=await client.auth.getUser();if(error||!user)return {ok:false,error:'Please sign in again before saving.'};
 const result=await client.from('member_profiles').upsert({...parsed.data,owner_id:user.id},{onConflict:'owner_id'}).select('id,username').single();
 if(result.error?.code==='23505')return {ok:false,error:'That username is already taken. Choose another one.'};
 if(result.error||!result.data)return {ok:false,error:'Profile could not be saved. If this is the first setup, apply the profiles database update.'};
 revalidatePath('/','layout');revalidatePath('/users','layout');revalidatePath('/account');revalidatePath('/profile','layout');revalidatePath('/forum','layout');
 return {ok:true,id:result.data.id,username:result.data.username};
 }catch{return {ok:false,error:'Profile service is unavailable. Your draft is still here.'};}
}
