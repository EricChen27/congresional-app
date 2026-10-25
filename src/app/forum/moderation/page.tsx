import Link from 'next/link';
import { getModerationQueue } from '@/lib/forum/queries';
import { ForumModeration } from '@/components/forum-moderation';
export const dynamic='force-dynamic';
export const metadata={title:'Forum moderation',robots:{index:false,follow:false}};
export default async function ModerationPage(){const queue=await getModerationQueue();return <div className="page-container forum-thread-page"><header className="page-heading"><Link href="/forum" className="text-link">← Forum</Link><h1>Moderation queue</h1><p>Review pending comments and reports. Allow disagreement; remove harassment, threats, private information, and spam.</p></header>{queue.error?<p className="notice" role="alert">{queue.error}</p>:queue.allowed&&<ForumModeration comments={queue.comments}/>}</div>;}
