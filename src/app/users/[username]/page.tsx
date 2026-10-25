import Link from 'next/link';
import { CommentTime } from '@/components/comment-time';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProfileAvatar } from '@/components/profile-avatar';
import type { MemberProfile } from '@/lib/profile/types';
export const dynamic='force-dynamic';
export const metadata={title:'Community profile'};
export default async function ProfilePage({params,searchParams}:{params:Promise<{username:string}>;searchParams:Promise<{page?:string}>}){
 const {username}=await params;if(!/^[a-z0-9_]{3,40}$/i.test(username))notFound();
 const page=Math.max(1,Math.min(5000,parseInt((await searchParams).page||'1',10)||1));
 let profile:MemberProfile|undefined;let comments:{id:string;bill_id:string;body:string;created_at:string}[]=[];let failed=false;let commentsFailed=false;
 try{const client=await createClient();if(!client)failed=true;else{const result=await client.rpc('member_by_username',{p_username:username});failed=!!result.error;profile=result.data?.[0];if(profile?.show_comments){const result=await client.rpc('member_profile_comments',{p_id:profile.id,p_offset:(page-1)*20});commentsFailed=!!result.error;comments=result.data||[];}}}catch{failed=true;}
 if(failed)return <div className="page-container"><p className="notice">Profiles are temporarily unavailable. Please try again later.</p></div>;
 if(!profile)notFound();
 if(username!==profile.username)redirect(`/users/${profile.username}${page>1?`?page=${page}`:''}`);
 return <div className="page-container"><header className="page-heading"><ProfileAvatar avatar={profile.avatar} name={profile.display_name}/><h1>{profile.display_name}</h1><p className="muted">@{profile.username}</p><p className="comment-body">{profile.bio||'A member of the BillBreakdown community.'}</p></header><section><h2>Public comments</h2>{!profile.show_comments?<p className="notice">This member does not share comment history on their profile.</p>:commentsFailed?<p className="notice">Comments could not be loaded. Try again later.</p>:<>{!comments.length&&<p>No approved comments to show on this page.</p>}{comments.slice(0,20).map(c=><article className="card forum-comment" key={c.id}><Link className="text-link" href={`/forum/${c.bill_id.replaceAll('-','/')}`}>{c.bill_id.toUpperCase()} · Open discussion →</Link><p className="comment-body">{c.body}</p><CommentTime value={c.created_at}/></article>)}<nav className="pagination" aria-label="Profile comment pages">{page>1&&<Link href={`/users/${profile.username}?page=${page-1}`}>Newer comments</Link>}{comments.length>20&&<Link href={`/users/${profile.username}?page=${page+1}`}>Older comments</Link>}</nav></>}</section></div>;
}
