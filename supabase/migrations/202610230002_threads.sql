begin;
alter table public.forum_comments add column parent_id uuid references public.forum_comments(id) on delete cascade;
alter table public.forum_comments add column reference jsonb;
create index forum_comments_parent on public.forum_comments(parent_id);

create function public.forum_post_reply(p_bill text,p_body text,p_parent uuid default null,p_reference jsonb default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid; parent_depth integer;
begin
 if auth.uid() is null then raise exception 'Sign in to post.'; end if;
 if p_parent is not null then
  perform 1 from public.forum_comments where id=p_parent and bill_id=p_bill and status='published' for update;
  if not found then raise exception 'Reply target is no longer available.'; end if;
  with recursive ancestors as (
   select id,parent_id,1 depth from public.forum_comments where id=p_parent
   union all select c.id,c.parent_id,a.depth+1 from public.forum_comments c join ancestors a on c.id=a.parent_id
  ) select max(depth) into parent_depth from ancestors;
  if parent_depth>=9 then raise exception 'This thread has reached its reply depth limit.'; end if;
 end if;
 if p_reference is not null and (jsonb_typeof(p_reference)<>'object' or
   coalesce(length(p_reference->>'version'),0) not between 1 and 200 or
   coalesce(length(p_reference->>'location'),0)>200 or
   coalesce(length(p_reference->>'quote'),0)>1500 or
   coalesce(length(p_reference->>'url'),0) not between 1 and 2000 or
   coalesce(p_reference->>'url','') !~ '^https://(www\.)?(congress\.gov|govinfo\.gov)/') then
  raise exception 'Invalid bill reference.';
 end if;
 result:=public.forum_post_comment(p_bill,p_body);
 update public.forum_comments set parent_id=p_parent,reference=p_reference where id=result;
 return result;
end;
$$;

-- Paginate whole root threads, never splitting children from their ancestors.
-- Nonpublic ancestors are placeholders only when a visible descendant needs them.
create function public.forum_thread_page(p_bill text,p_page integer default 1) returns jsonb
language sql stable security definer set search_path='' as $$
 with recursive tree as (
  select c.*,c.id root_id,array[c.id] trail,0 depth from public.forum_comments c where c.bill_id=p_bill and c.parent_id is null
  union all select c.*,t.root_id,t.trail||c.id,t.depth+1 from public.forum_comments c join tree t on c.parent_id=t.id where c.bill_id=p_bill and t.depth<8
 ), visible as (
  select * from tree where status='published' or (owner_id=auth.uid() and status in ('pending','hidden'))
 ), roots as (
  select t.id,t.created_at from tree t where t.parent_id is null and exists(select 1 from visible v where v.root_id=t.id)
  order by t.created_at desc,t.id desc limit 11 offset (greatest(1,least(p_page,10000))-1)*10
 ), page_roots as (select * from roots order by created_at desc,id desc limit 10), projected as (
  select t.id,t.parent_id,t.depth,
   case when v.id is null then '[Comment unavailable]' else t.body end body,
   case when v.id is null then 'unavailable' else t.status end status,t.created_at,
   case when v.id is null then 'Member' else coalesce(p.display_name,'Member '||left(md5(t.owner_id::text),8)) end author_label,
   (v.id is not null and coalesce(t.owner_id=auth.uid(),false)) is_own,
   case when v.id is not null then p.id end profile_id,
   case when v.id is not null then coalesce(p.avatar,'') else '' end avatar,
   case when v.id is not null then t.reference end reference,r.created_at root_date,r.id root_sort
  from tree t join page_roots r on r.id=t.root_id left join visible v on v.id=t.id
  left join public.member_profiles p on p.owner_id=t.owner_id
  where exists(select 1 from visible child where t.id=any(child.trail))
 ) select jsonb_build_object('comments',coalesce((select jsonb_agg(to_jsonb(p)-'root_date'-'root_sort' order by root_date desc,root_sort desc,created_at,id) from projected p),'[]'::jsonb),'hasMore',(select count(*)>10 from roots));
$$;
create function public.forum_thread_moderation_queue() returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(q)||jsonb_build_object('parent_id',c.parent_id,'reference',c.reference)),'[]'::jsonb)
 from public.forum_moderation_queue() q join public.forum_comments c on c.id=q.id;
$$;
revoke all on function public.forum_post_reply(text,text,uuid,jsonb),public.forum_thread_page(text,integer),public.forum_thread_moderation_queue() from public;
grant execute on function public.forum_post_reply(text,text,uuid,jsonb),public.forum_thread_moderation_queue() to authenticated;
grant execute on function public.forum_thread_page(text,integer) to anon,authenticated;
commit;
