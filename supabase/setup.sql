-- BillBreakdown: run ONCE in a new Supabase project.
-- Creates dictionary and moderated forum tables and access rules.
-- If you already ran any migrations, do not run this combined file.

begin;

-- 202610220001_dictionary.sql
-- Run this migration in the Supabase SQL editor or with `supabase db push`.
-- All application calls use the publishable key and a verified user's JWT.
-- No service-role key is used by the app.

create function public.normalize_dictionary_term(value text)
returns text language sql immutable strict
set search_path = ''
as $$ select lower(btrim(regexp_replace(normalize(value, NFKC), '\s+', ' ', 'g'))); $$;

create table public.dictionary_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  term text not null check (char_length(btrim(term)) between 1 and 100),
  normalized_term text generated always as (public.normalize_dictionary_term(term)) stored,
  definition text not null default '' check (char_length(definition) <= 4000),
  definition_origin text not null default 'unset' check (definition_origin in ('curated', 'personal', 'unset')),
  glossary_id text check (char_length(glossary_id) <= 100),
  definition_source_url text check (char_length(definition_source_url) <= 2000 and definition_source_url ~ '^https://((www\.)?(congress\.gov|govinfo\.gov)|([a-z0-9-]+\.)*senate\.gov)/'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, normalized_term),
  unique (id, owner_id),
  check ((definition = '' and definition_origin = 'unset') or (definition <> '' and definition_origin <> 'unset'))
);

create table public.dictionary_contexts (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null,
  owner_id uuid not null default auth.uid(),
  bill_id text not null check (char_length(bill_id) between 1 and 100),
  bill_title text not null check (char_length(bill_title) between 1 and 1000),
  congress integer not null check (congress between 1 and 999),
  bill_type text not null check (bill_type in ('hr', 's', 'hjres', 'sjres', 'hconres', 'sconres', 'hres', 'sres')),
  bill_number text not null check (bill_number ~ '^\d{1,7}$'),
  document_kind text not null check (document_kind in ('summary', 'text')),
  version_id text not null check (char_length(version_id) between 1 and 200),
  version_label text not null check (char_length(version_label) between 1 and 200),
  version_date text not null default '' check (char_length(version_date) <= 50),
  selected_text text not null check (char_length(selected_text) between 1 and 160),
  excerpt text not null default '' check (char_length(excerpt) <= 1200),
  source_url text not null check (char_length(source_url) <= 2000 and source_url ~ '^https://(www\.|api\.)?(congress\.gov|govinfo\.gov)/'),
  created_at timestamptz not null default now(),
  foreign key (entry_id, owner_id) references public.dictionary_entries(id, owner_id) on delete cascade,
  unique (entry_id, bill_id, document_kind, version_id, selected_text)
);

create index dictionary_contexts_owner on public.dictionary_contexts(owner_id);

create function public.touch_dictionary_entry()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger dictionary_entry_updated before update on public.dictionary_entries
for each row execute function public.touch_dictionary_entry();

alter table public.dictionary_entries enable row level security;
alter table public.dictionary_entries force row level security;
alter table public.dictionary_contexts enable row level security;
alter table public.dictionary_contexts force row level security;

create policy "Read own dictionary entries" on public.dictionary_entries for select to authenticated
using ((select auth.uid()) = owner_id);
create policy "Create own dictionary entries" on public.dictionary_entries for insert to authenticated
with check ((select auth.uid()) = owner_id);
create policy "Edit own dictionary entries" on public.dictionary_entries for update to authenticated
using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "Delete own dictionary entries" on public.dictionary_entries for delete to authenticated
using ((select auth.uid()) = owner_id);

create policy "Read own dictionary contexts" on public.dictionary_contexts for select to authenticated
using ((select auth.uid()) = owner_id);
create policy "Create own dictionary contexts" on public.dictionary_contexts for insert to authenticated
with check ((select auth.uid()) = owner_id);
create policy "Edit own dictionary contexts" on public.dictionary_contexts for update to authenticated
using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "Delete own dictionary contexts" on public.dictionary_contexts for delete to authenticated
using ((select auth.uid()) = owner_id);

revoke all on public.dictionary_entries, public.dictionary_contexts from anon;
grant select, insert, update, delete on public.dictionary_entries, public.dictionary_contexts to authenticated;

-- An RPC is one database transaction: invalid context means no orphan entry.
-- Conflict preserves an existing definition and merely appends source context.
create function public.save_dictionary_entry(
  p_term text,
  p_definition text default '',
  p_definition_origin text default 'unset',
  p_glossary_id text default null,
  p_definition_source_url text default null,
  p_context jsonb default null
)
returns uuid
language plpgsql security invoker
set search_path = ''
as $$
declare
  current_owner uuid := auth.uid();
  saved_id uuid;
begin
  if current_owner is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  insert into public.dictionary_entries (owner_id, term, definition, definition_origin, glossary_id, definition_source_url)
  values (current_owner, btrim(p_term), coalesce(btrim(p_definition), ''),
    case when coalesce(btrim(p_definition), '') = '' then 'unset' else p_definition_origin end,
    p_glossary_id, p_definition_source_url)
  on conflict (owner_id, normalized_term) do update
    set updated_at = dictionary_entries.updated_at
  returning id into saved_id;

  if p_context is not null then
    insert into public.dictionary_contexts (
      entry_id, owner_id, bill_id, bill_title, congress, bill_type, bill_number,
      document_kind, version_id, version_label, version_date, selected_text, excerpt, source_url
    ) values (
      saved_id, current_owner, p_context->>'billId', p_context->>'billTitle', (p_context->>'congress')::integer,
      p_context->>'billType', p_context->>'billNumber', p_context->>'documentKind',
      p_context->>'versionId', p_context->>'versionLabel', coalesce(p_context->>'versionDate', ''),
      p_context->>'selectedText', coalesce(p_context->>'excerpt', ''), p_context->>'sourceUrl'
    ) on conflict (entry_id, bill_id, document_kind, version_id, selected_text) do nothing;
  end if;
  return saved_id;
end;
$$;

revoke all on function public.save_dictionary_entry(text,text,text,text,text,jsonb) from public, anon;
grant execute on function public.save_dictionary_entry(text,text,text,text,text,jsonb) to authenticated;


-- 202610220002_civic_sources.sql
-- Expand sourced vocabulary beyond congressional procedure. Bill-context URLs stay restricted.
alter table public.dictionary_entries drop constraint if exists dictionary_entries_definition_source_url_check;
alter table public.dictionary_entries add constraint dictionary_entries_definition_source_url_check
check (char_length(definition_source_url) <= 2000 and definition_source_url ~ '^https://([a-z0-9-]+\.)*(congress\.gov|govinfo\.gov|senate\.gov|house\.gov|ssa\.gov|medicare\.gov|usa\.gov|hhs\.gov|fda\.gov|energy\.gov)/');


-- 202610220003_forum.sql
-- Forum writes are only possible through guarded RPCs; there are no client table-write grants.
create table public.forum_moderators (
  user_id uuid primary key references auth.users(id) on delete cascade
);
create table public.forum_comments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  bill_id text not null check (bill_id ~ '^[0-9]{2,3}-(hr|s)-[1-9][0-9]{0,5}$'),
  body text not null check (char_length(btrim(body)) between 10 and 3000),
  status text not null default 'pending' check (status in ('pending','published','hidden','deleted')),
  created_at timestamptz not null default now(),
  moderated_at timestamptz,
  moderated_by uuid references auth.users(id) on delete set null
);
create index forum_comments_bill on public.forum_comments(bill_id,created_at desc);
create index forum_comments_owner on public.forum_comments(owner_id,created_at desc);
create table public.forum_reports (
  comment_id uuid not null references public.forum_comments(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (reason in ('harassment','spam','personal-information','other')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  primary key(comment_id,reporter_id)
);
create table public.forum_moderation_log (
  id bigint generated always as identity primary key,
  comment_id uuid not null references public.forum_comments(id) on delete cascade,
  moderator_id uuid references auth.users(id) on delete set null,
  decision text not null check(decision in ('published','hidden')),
  created_at timestamptz not null default now()
);
alter table public.forum_moderators enable row level security;
alter table public.forum_comments enable row level security;
alter table public.forum_reports enable row level security;
alter table public.forum_moderation_log enable row level security;
-- Private tables have default-deny RLS; RPCs expose only their documented projection.
revoke all on public.forum_moderators,public.forum_comments,public.forum_reports,public.forum_moderation_log from anon,authenticated;

create function public.forum_is_moderator() returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.forum_moderators where user_id=auth.uid());
$$;

create function public.forum_list_comments(p_bill text,p_offset integer default 0)
returns table(id uuid,body text,status text,created_at timestamptz,author_label text,is_own boolean)
language sql stable security definer set search_path='' as $$
 select c.id,c.body,c.status,c.created_at,'Member '||left(md5(c.owner_id::text),8),coalesce(c.owner_id=auth.uid(),false)
 from public.forum_comments c where c.bill_id=p_bill and (c.status='published' or (c.owner_id=auth.uid() and c.status in ('pending','hidden')))
 order by c.created_at desc,c.id desc limit 51 offset greatest(0,least(p_offset,100000));
$$;

create function public.forum_post_comment(p_bill text,p_body text) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); result uuid;
begin
 if actor is null then raise exception 'Sign in to post.'; end if;
 if not exists(select 1 from auth.users where id=actor and email_confirmed_at is not null) then raise exception 'Verify your account before posting.'; end if;
 if not exists(select 1 from public.forum_moderators) then raise exception 'Posting opens when a moderator is assigned.'; end if;
 if p_bill is null or p_bill !~ '^[0-9]{2,3}-(hr|s)-[1-9][0-9]{0,5}$' or p_body is null or char_length(btrim(p_body)) not between 10 and 3000 then raise exception 'Check your bill and comment length.'; end if;
 perform pg_advisory_xact_lock(hashtext(actor::text));
 if exists(select 1 from public.forum_comments where owner_id=actor and created_at>now()-interval '1 minute') then raise exception 'Please wait one minute between comments.'; end if;
 if (select count(*) from public.forum_comments where owner_id=actor and created_at>now()-interval '1 day')>=20 then raise exception 'Daily limit reached. Please try tomorrow.'; end if;
 insert into public.forum_comments(owner_id,bill_id,body) values(actor,p_bill,btrim(p_body)) returning id into result;
 return result;
end;
$$;

create function public.forum_remove_comment(p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in to remove a comment.'; end if;
 update public.forum_comments set status='deleted',body='[Removed by author]' where id=p_id and owner_id=auth.uid() and status<>'deleted';
 if not found then raise exception 'Comment unavailable or not yours.'; end if;
 update public.forum_reports set resolved_at=now() where comment_id=p_id and resolved_at is null;
end;
$$;

create function public.forum_report_comment(p_id uuid,p_reason text) returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();
begin
 if actor is null then raise exception 'Sign in to report.'; end if;
 if p_reason is null or p_reason not in ('harassment','spam','personal-information','other') then raise exception 'Choose a report reason.'; end if;
 perform pg_advisory_xact_lock(hashtext(actor::text));
 if (select count(*) from public.forum_reports where reporter_id=actor and created_at>now()-interval '1 day')>=20 then raise exception 'Daily report limit reached.'; end if;
 -- Lock against simultaneous moderator/author changes.
 perform 1 from public.forum_comments where id=p_id and status='published' and owner_id<>actor for update;
 if not found then raise exception 'This comment cannot be reported.'; end if;
 insert into public.forum_reports(comment_id,reporter_id,reason) values(p_id,actor,p_reason) on conflict do nothing;
end;
$$;

create function public.forum_moderation_queue()
returns table(id uuid,bill_id text,body text,status text,created_at timestamptz,report_count bigint,reasons text[])
language plpgsql stable security definer set search_path='' as $$
begin
 if not public.forum_is_moderator() then raise exception 'Moderator access required.'; end if;
 return query select c.id,c.bill_id,c.body,c.status,c.created_at,count(r.comment_id),array_remove(array_agg(distinct r.reason),null)
 from public.forum_comments c left join public.forum_reports r on r.comment_id=c.id and r.resolved_at is null
 where c.status='pending' or (c.status='published' and exists(select 1 from public.forum_reports x where x.comment_id=c.id and x.resolved_at is null))
 group by c.id order by count(r.comment_id) desc,c.created_at asc limit 100;
end;
$$;

create function public.forum_moderate_comment(p_id uuid,p_decision text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.forum_is_moderator() then raise exception 'Moderator access required.'; end if;
 if p_decision is null or p_decision not in ('published','hidden') then raise exception 'Invalid decision.'; end if;
 update public.forum_comments set status=p_decision,moderated_at=now(),moderated_by=auth.uid() where id=p_id and status<>'deleted';
 if not found then raise exception 'Comment no longer available.'; end if;
 update public.forum_reports set resolved_at=now() where comment_id=p_id and resolved_at is null;
 insert into public.forum_moderation_log(comment_id,moderator_id,decision) values(p_id,auth.uid(),p_decision);
end;
$$;

revoke all on function public.forum_is_moderator(),public.forum_list_comments(text,integer),public.forum_post_comment(text,text),public.forum_remove_comment(uuid),public.forum_report_comment(uuid,text),public.forum_moderation_queue(),public.forum_moderate_comment(uuid,text) from public;
grant execute on function public.forum_list_comments(text,integer) to anon,authenticated;
grant execute on function public.forum_is_moderator(),public.forum_post_comment(text,text),public.forum_remove_comment(uuid),public.forum_report_comment(uuid,text),public.forum_moderation_queue(),public.forum_moderate_comment(uuid,text) to authenticated;


-- 202610220004_government_sources.sql
-- Add vetted educational references; bill-context source restrictions are unchanged.
alter table public.dictionary_entries drop constraint dictionary_entries_definition_source_url_check;
alter table public.dictionary_entries add constraint dictionary_entries_definition_source_url_check
check (char_length(definition_source_url) <= 2000 and definition_source_url ~ '^https://(([a-z0-9-]+\.)*(congress\.gov|govinfo\.gov|senate\.gov|house\.gov|ssa\.gov|medicare\.gov|usa\.gov|hhs\.gov|fda\.gov|energy\.gov|archives\.gov|eac\.gov)|apcentral\.collegeboard\.org|www\.oxfordlearnersdictionaries\.com)/');



-- 202610230001_profiles.sql
-- Public profile IDs are separate from private authentication IDs. Photos are
-- small JPEG thumbnails, stored with the profile so removal is atomic.
create table public.member_profiles (
 owner_id uuid primary key references auth.users(id) on delete cascade,
 id uuid not null unique default gen_random_uuid(),
 display_name text not null check(char_length(btrim(display_name)) between 2 and 50),
 bio text not null default '' check(char_length(bio)<=500),
 avatar text not null default '' check(char_length(avatar)<=200000 and (avatar='' or avatar ~ '^data:image/jpeg;base64,/9j/[A-Za-z0-9+/=]+$')),
 show_comments boolean not null default false
);
alter table public.member_profiles enable row level security;
revoke all on public.member_profiles from anon,authenticated;
grant select,insert,update on public.member_profiles to authenticated;
create policy profile_owner on public.member_profiles for all to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());

create function public.public_member_profile(p_id uuid)
returns table(id uuid,display_name text,bio text,avatar text,show_comments boolean)
language sql stable security definer set search_path='' as $$
 select id,display_name,bio,avatar,show_comments from public.member_profiles where id=p_id;
$$;
create function public.member_profile_comments(p_id uuid,p_offset integer default 0)
returns table(id uuid,bill_id text,body text,created_at timestamptz)
language sql stable security definer set search_path='' as $$
 select c.id,c.bill_id,c.body,c.created_at from public.forum_comments c
 join public.member_profiles p on p.owner_id=c.owner_id
 where p.id=p_id and p.show_comments and c.status='published'
 order by c.created_at desc,c.id desc limit 21 offset greatest(0,least(p_offset,100000));
$$;
-- Keep the original RPC for compatibility while the application is updating.
create function public.forum_list_profile_comments(p_bill text,p_offset integer default 0)
returns table(id uuid,body text,status text,created_at timestamptz,author_label text,is_own boolean,profile_id uuid,avatar text)
language sql stable security definer set search_path='' as $$
 select c.id,c.body,c.status,c.created_at,coalesce(p.display_name,'Member '||left(md5(c.owner_id::text),8)),coalesce(c.owner_id=auth.uid(),false),p.id,coalesce(p.avatar,'')
 from public.forum_comments c left join public.member_profiles p on p.owner_id=c.owner_id
 where c.bill_id=p_bill and (c.status='published' or (c.owner_id=auth.uid() and c.status in ('pending','hidden')))
 order by c.created_at desc,c.id desc limit 51 offset greatest(0,least(p_offset,100000));
$$;
revoke all on function public.public_member_profile(uuid),public.member_profile_comments(uuid,integer),public.forum_list_profile_comments(text,integer) from public;
grant execute on function public.public_member_profile(uuid),public.member_profile_comments(uuid,integer),public.forum_list_profile_comments(text,integer) to anon,authenticated;


-- 202610230002_threads.sql
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


-- 202610230003_usernames.sql
alter table public.member_profiles add column username text;
-- Existing profiles retain a working public address until their owner chooses a handle.
update public.member_profiles set username='member_'||replace(id::text,'-','');
alter table public.member_profiles alter column username set not null;
alter table public.member_profiles add constraint member_profiles_username_format check(username ~ '^[a-z0-9_]{3,40}$');
alter table public.member_profiles add constraint member_profiles_username_key unique(username);
create function public.normalize_profile_username() returns trigger language plpgsql set search_path='' as $$
begin new.username:=lower(btrim(new.username));return new;end;
$$;
create trigger normalize_profile_username before insert or update of username on public.member_profiles for each row execute function public.normalize_profile_username();

create function public.member_by_username(p_username text)
returns table(id uuid,username text,display_name text,bio text,avatar text,show_comments boolean)
language sql stable security definer set search_path='' as $$
 select id,username,display_name,bio,avatar,show_comments from public.member_profiles where username=lower(btrim(p_username));
$$;
create function public.member_username_for_id(p_id uuid) returns text
language sql stable security definer set search_path='' as $$select username from public.member_profiles where id=p_id;$$;
create function public.forum_username_page(p_bill text,p_page integer default 1) returns jsonb
language sql stable security definer set search_path='' as $$
 with page as (select public.forum_thread_page(p_bill,p_page) data)
 select jsonb_set(data,'{comments}',coalesce((select jsonb_agg(c.value||jsonb_build_object('username',p.username) order by c.ordinality)
 from jsonb_array_elements(data->'comments') with ordinality c(value,ordinality)
 left join public.member_profiles p on p.id::text=c.value->>'profile_id'),'[]'::jsonb)) from page;
$$;
revoke all on function public.normalize_profile_username(),public.member_by_username(text),public.member_username_for_id(uuid),public.forum_username_page(text,integer) from public;
grant execute on function public.member_by_username(text),public.member_username_for_id(uuid),public.forum_username_page(text,integer) to anon,authenticated;


-- 202610230004_saved_bills.sql
-- Run once in the existing project's SQL editor. Independent of forum migrations.

create table public.saved_bills (
 owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 bill_id text not null check (bill_id ~ '^[0-9]{2,3}-(hr|s)-[1-9][0-9]{0,5}$'),
 title text not null check (char_length(title) between 1 and 2000),
 favorite boolean not null default false,
 created_at timestamptz not null default now(),
 primary key(owner_id,bill_id)
);
alter table public.saved_bills enable row level security;
revoke all on public.saved_bills from public, anon;
grant select,insert,update,delete on public.saved_bills to authenticated;
create policy saved_bills_owner on public.saved_bills for all to authenticated
 using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));


commit;
