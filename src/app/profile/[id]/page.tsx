import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
export const dynamic='force-dynamic';
export default async function LegacyProfile({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{page?:string}>}){
 const {id}=await params;if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))notFound();
 let username:string|null=null;let failed=false;
 try{const client=await createClient();const result=await client?.rpc('member_username_for_id',{p_id:id});failed=!result||!!result.error;username=result?.data||null;}catch{failed=true;}
 if(failed)return <div className="page-container"><p className="notice">Profiles are temporarily unavailable. Please try again later.</p></div>;
 if(!username)notFound();const page=Math.max(1,Math.min(5000,parseInt((await searchParams).page||'1',10)||1));
 redirect(`/users/${username}${page>1?`?page=${page}`:''}`);
}
