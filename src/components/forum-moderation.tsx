'use client';
import Link from 'next/link';
import { CommentReference } from './comment-reference';
import { CommentTime } from './comment-time';
import { useState,useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { moderateForumComment } from '@/lib/forum/actions';
import type { ModerationComment } from '@/lib/forum/types';
export function ForumModeration({comments}:{comments:ModerationComment[]}){
 const [pending,startTransition]=useTransition();const [message,setMessage]=useState('');const router=useRouter();
 return <><p role="status">{message}</p>{!comments.length&&<div className="notice">The moderation queue is clear.</div>}{comments.map(comment=><article className="card forum-comment" key={comment.id}><Link className="text-link" href={`/forum/${comment.bill_id.replaceAll('-','/')}`}>{comment.bill_id} →</Link><p>{comment.status==='pending'?'Awaiting approval':`${comment.report_count} reports`} {comment.reasons?.join(', ')}</p><CommentTime value={comment.created_at}/>{comment.parent_id&&<p className="muted">Reply to another comment in this discussion.</p>}<p className="comment-body">{comment.body}</p><CommentReference reference={comment.reference}/><div className="forum-actions">{[{value:'published',label:comment.status==='pending'?'Approve and publish':'Keep published / resolve reports'},{value:'hidden',label:'Hide comment'}].map(action=><button className="button button-secondary" key={action.value} disabled={pending} onClick={()=>startTransition(async()=>{const result=await moderateForumComment(comment.id,action.value);setMessage(result.ok?'Moderation decision saved.':result.error||'Decision was not saved.');if(result.ok)router.refresh();})}>{action.label}</button>)}</div></article>)}<p className="muted">Showing up to 100 pending or reported comments. Process these and reload to see more. Decisions are recorded for accountability.</p></>;
}
