begin;
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
commit;
