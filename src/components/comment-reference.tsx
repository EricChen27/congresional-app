import type { BillReference } from '@/lib/forum/types';
export function CommentReference({reference}:{reference?:BillReference|null}){
 if(!reference)return null;
 return <aside className="comment-reference"><strong>Bill reference · {reference.version}</strong>{reference.location&&<p>{reference.location}</p>}{reference.quote&&<blockquote>{reference.quote}</blockquote>}<a className="text-link" href={reference.url} target="_blank" rel="noreferrer">Check the official bill text ↗</a><p className="muted">Location and quotation supplied by the commenter; verify against this version.</p></aside>;
}
