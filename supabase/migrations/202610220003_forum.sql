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
